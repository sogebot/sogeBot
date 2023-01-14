import * as constants from '@sogebot/ui-helpers/constants';
import chalk from 'chalk';

import { getChannelChatBadges } from '../calls/getChannelChatBadges';

import {
  debug, error, warning,
} from '~/helpers/log';
import { logAvgTime } from '~/helpers/profiler';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import { checkClips } from '~/services/twitch/calls/checkClips';
import { getChannelChatters } from '~/services/twitch/calls/getChannelChatters';
import { getChannelInformation } from '~/services/twitch/calls/getChannelInformation';
import { getChannelSubscribers } from '~/services/twitch/calls/getChannelSubscribers';
import { getCurrentStream } from '~/services/twitch/calls/getCurrentStream';
import { getLatest100Followers } from '~/services/twitch/calls/getLatest100Followers';
import { getModerators } from '~/services/twitch/calls/getModerators';
import { updateBroadcasterType } from '~/services/twitch/calls/updateBroadcasterType';
import { variables } from '~/watchers';

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
  getLatest100Followers: getLatest100Followers,
  getChannelSubscribers: getChannelSubscribers,
  getChannelChatters:    getChannelChatters,
  getChannelChatBadges:  getChannelChatBadges,
  checkClips:            checkClips,
  getModerators:         getModerators,
} as const;

export const init = () => {
  addInterval('getCurrentStream', constants.MINUTE);
  addInterval('updateBroadcasterType', constants.HOUR);
  addInterval('getLatest100Followers', constants.MINUTE);
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