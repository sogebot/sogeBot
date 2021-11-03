import { ThreadEvent } from '@entity/threadEvent';
import * as constants from '@sogebot/ui-helpers/constants';
import chalk from 'chalk';
import {
  getManager,
} from 'typeorm';

import { get } from '~/helpers/interfaceEmitter';
import {
  debug, error, warning,
} from '~/helpers/log';
import { logAvgTime } from '~/helpers/profiler';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';

const intervals = new Map<string, {
  interval: number;
  isDisabled: boolean;
  lastRunAt: number;
  opts: Record<string, any>;
}>();

const addInterval = (fnc: string, intervalId: number) => {
  intervals.set(fnc, {
    interval: intervalId, lastRunAt: 0, opts: {}, isDisabled: false,
  });
};

addInterval('getCurrentStreamData', constants.MINUTE);
addInterval('getCurrentStreamTags', constants.MINUTE);
addInterval('updateChannelViewsAndBroadcasterType', constants.HOUR);
addInterval('getLatest100Followers', constants.MINUTE);
addInterval('getChannelFollowers', constants.DAY);
addInterval('getChannelSubscribers', 2 * constants.MINUTE);
addInterval('getChannelChattersUnofficialAPI', 5 * constants.MINUTE);
addInterval('getChannelInformation', constants.MINUTE);
addInterval('checkClips', constants.MINUTE);
addInterval('getAllStreamTags', constants.DAY);
addInterval('getModerators', 10 * constants.MINUTE);
addInterval('getBannedEvents', 10 * constants.MINUTE);

// free thread_event
getManager()
  .createQueryBuilder()
  .delete()
  .from(ThreadEvent)
  .where('event = :event', { event: 'getChannelChattersUnofficialAPI' })
  .execute();

let isBlocking: boolean | string = false;

const check = async () => {
  const [ botTokenValid, broadcasterTokenValid ] = await Promise.all([
    get<boolean>('/services/twitch', 'botTokenValid'),
    get<boolean>('/services/twitch', 'broadcasterTokenValid'),
  ]);
  if (!botTokenValid || broadcasterTokenValid) {
    debug('api.interval', 'Tokens not valid.');
  }
  if (isBlocking) {
    debug('api.interval', chalk.yellow(isBlocking + '() ') + 'still in progress.');
    return;
  }
  for (const fnc of intervals.keys()) {
    await setImmediateAwait();
    debug('api.interval', chalk.yellow(fnc + '() ') + 'check');
    let interval = intervals.get(fnc);
    if (!interval) {
      error(`Interval ${fnc} not found.`);
      continue;
    }
    if (interval.isDisabled) {
      debug('api.interval', chalk.yellow(fnc + '() ') + 'disabled');
      continue;
    }
    if (Date.now() - interval.lastRunAt >= interval.interval) {
      // run validation before any requests
      const[ botValidation, broadcasterValidation ] = await Promise.all(oauth.validateTokens());
      if (!botValidation || !broadcasterValidation) {
        continue;
      }

      isBlocking = fnc;
      debug('api.interval', chalk.yellow(fnc + '() ') + 'start');
      const time = process.hrtime();
      const time2 = Date.now();
      try {
        const value = await Promise.race<Promise<any>>([
          new Promise((resolve, reject) => {
            if (fnc === 'updateChannelViewsAndBroadcasterType') {
              updateChannelViewsAndBroadcasterType()
                .then((data: any) => resolve(data))
                .catch((e) => reject(e));
            } else {
              (this as any)[fnc](interval?.opts)
                .then((data: any) => resolve(data))
                .catch((e: any) => reject(e));
            }
          }),
          new Promise((_resolve, reject) => setTimeout(() => reject(), 10 * constants.MINUTE)),
        ]);
        logAvgTime(`api.${fnc}()`, process.hrtime(time));
        debug('api.interval', chalk.yellow(fnc + '(time: ' + (Date.now() - time2 + ') ') + JSON.stringify(value)));
        intervals.set(fnc, {
          ...interval,
          lastRunAt: Date.now(),
        });
        if (value.disable) {
          intervals.set(fnc, {
            ...interval,
            isDisabled: true,
          });
          debug('api.interval', chalk.yellow(fnc + '() ') + 'disabled');
          continue;
        }
        debug('api.interval', chalk.yellow(fnc + '() ') + 'done, value:' + JSON.stringify(value));

        interval = intervals.get(fnc); // refresh data
        if (!interval) {
          error(`Interval ${fnc} not found.`);
          continue;
        }

        if (value.state) { // if is ok, update opts and run unlock after a while
          intervals.set(fnc, {
            ...interval,
            opts: value.opts ?? {},
          });
        } else { // else run next tick
          intervals.set(fnc, {
            ...interval,
            opts:      value.opts ?? {},
            lastRunAt: 0,
          });
        }
      } catch (e: any) {
        warning(`API call for ${fnc} is probably frozen (took more than 10minutes), forcefully unblocking`);
        debug('api.interval', chalk.yellow(fnc + '() ') + e);
        continue;
      } finally {
        debug('api.interval', chalk.yellow(fnc + '() ') + 'unblocked.');
        isBlocking = false;
      }
    } else {
      debug('api.interval', chalk.yellow(fnc + '() ') + `skip run, lastRunAt: ${interval.lastRunAt}`  );
    }
  }
};
setInterval(check, 10000);