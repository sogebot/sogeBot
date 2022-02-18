import { User } from '@entity/user';
import { HOUR, MINUTE } from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import { debug } from '../log';
import { logAvgTime } from '../profiler';
import { setImmediateAwait } from '../setImmediateAwait';
import * as changelog from '../user/changelog';
import { cleanViewersCache } from './cache';
import { getUserHighestPermission } from './getUserHighestPermission';

let isRecacheRunning = false;
let rechacheFinishedAt = 0;
const recacheIds = new Map<string, number>();

export function recacheOnlineUsersPermission() {
  if (!isRecacheRunning && Date.now() - rechacheFinishedAt > 10 * MINUTE) {
    const time = process.hrtime();
    changelog.flush().then(() => {
      getRepository(User).find({ isOnline: true }).then(async (users2) => {
        isRecacheRunning = true;
        // we need to recache only users not recached in 30 minutes
        for (const user of users2) {
          if (!recacheIds.has(user.userId) || (Date.now() - (recacheIds.get(user.userId) ?? 0) > 30 * MINUTE)) {
            debug('permissions.recache', `Recaching ${user.userName}#${user.userId}`);
            cleanViewersCache(user.userId);
            await getUserHighestPermission(user.userId);
            await setImmediateAwait();
            recacheIds.set(user.userId, Date.now());
          } else {
            debug('permissions.recache', `Recaching SKIPPED ${user.userName}#${user.userId}`);
          }
        }
        isRecacheRunning = false;
        rechacheFinishedAt = Date.now();
        logAvgTime('recacheOnlineUsersPermission()', process.hrtime(time));
      });
    });
  }

  // remove all recacheIds when time is more than HOUR
  for (const userId of Array.from(recacheIds.keys())) {
    if (Date.now() - (recacheIds.get(userId) ?? 0) > HOUR) {
      recacheIds.delete(userId);
    }
  }
}