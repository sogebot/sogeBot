import * as constants from '@sogebot/ui-helpers/constants.js';
import chalk from 'chalk';

import { getChannelChatBadges } from '../calls/getChannelChatBadges.js';
import { getChannelFollowers } from '../calls/getChannelFollowers.js';

import {
  debug, error, warning,
} from '~/helpers/log.js';
import { logAvgTime } from '~/helpers/profiler.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import { checkClips } from '~/services/twitch/calls/checkClips.js';
import { getChannelChatters } from '~/services/twitch/calls/getChannelChatters.js';
import { getChannelInformation } from '~/services/twitch/calls/getChannelInformation.js';
import { getChannelSubscribers } from '~/services/twitch/calls/getChannelSubscribers.js';
import { getCurrentStream } from '~/services/twitch/calls/getCurrentStream.js';
import { getModerators } from '~/services/twitch/calls/getModerators.js';
import { updateBroadcasterType } from '~/services/twitch/calls/updateBroadcasterType.js';
import { variables } from '~/watchers.js';

const intervals = new Map<keyof typeof functions, {
  interval: number;
  isDisabled: boolean;
  lastRunAt: number;
  opts: Record<string, any>;
}>();

const addInterval = (fnc: keyof typeof functions, intervalId: number) => {
  intervals.set(fnc, {
    interval: intervalId, lastRunAt: 0, opts: {}, isDisabled: false,
  });
};

const functions = {
  getCurrentStream:      getCurrentStream,
  getChannelInformation: getChannelInformation,
  updateBroadcasterType: updateBroadcasterType,
  getChannelSubscribers: getChannelSubscribers,
  getChannelChatters:    getChannelChatters,
  getChannelChatBadges:  getChannelChatBadges,
  checkClips:            checkClips,
  getModerators:         getModerators,
  getChannelFollowers:   getChannelFollowers,
} as const;

export const init = () => {
  addInterval('getChannelFollowers', constants.MINUTE);
  addInterval('getCurrentStream', constants.MINUTE);
  addInterval('updateBroadcasterType', constants.HOUR);
  addInterval('getChannelSubscribers', 2 * constants.MINUTE);
  addInterval('getChannelChatters', 5 * constants.MINUTE);
  addInterval('getChannelChatBadges', 5 * constants.MINUTE);
  addInterval('getChannelInformation', constants.MINUTE);
  addInterval('checkClips', constants.MINUTE);
  addInterval('getModerators', 10 * constants.MINUTE);
};

export const stop = () => {
  intervals.clear();
};

let isBlocking: boolean | string = false;

const check = async () => {
  if (isBlocking) {
    debug('api.interval', chalk.yellow(isBlocking + '() ') + 'still in progress.');
    return;
  }
  for (const fnc of intervals.keys()) {
    await setImmediateAwait();

    const botTokenValid = variables.get('services.twitch.botTokenValid') as string;
    const broadcasterTokenValid = variables.get('services.twitch.broadcasterTokenValid') as string;
    if (!botTokenValid || !broadcasterTokenValid) {
      debug('api.interval', 'Tokens not valid.');
      return;
    }

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
      isBlocking = fnc;
      debug('api.interval', chalk.yellow(fnc + '() ') + 'start');
      const time = process.hrtime();
      const time2 = Date.now();
      try {
        const value = await Promise.race<Promise<any>>([
          new Promise((resolve, reject) => {
            functions[fnc](interval?.opts)
              .then((data: any) => resolve(data))
              .catch((e: any) => reject(e));
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
      } catch (e) {
        if (e instanceof Error) {
          error(e.stack ?? e.message);
        }
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