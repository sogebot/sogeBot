import * as constants from '@sogebot/ui-helpers/constants';
import chalk from 'chalk';

import { validate } from '../token/validate';

import {
  debug, error, warning,
} from '~/helpers/log';
import { logAvgTime } from '~/helpers/profiler';
import { setImmediateAwait } from '~/helpers/setImmediateAwait';
import { variable } from '~/helpers/variables';
import { checkClips } from '~/services/twitch/calls/checkClips';
import { getAllStreamTags } from '~/services/twitch/calls/getAllStreamTags';
import { getBannedEvents } from '~/services/twitch/calls/getBannedEvents';
import { getChannelChattersUnofficialAPI } from '~/services/twitch/calls/getChannelChattersUnofficialAPI';
import { getChannelFollowers } from '~/services/twitch/calls/getChannelFollowers';
import { getChannelInformation } from '~/services/twitch/calls/getChannelInformation';
import { getChannelSubscribers } from '~/services/twitch/calls/getChannelSubscribers';
import { getCurrentStream } from '~/services/twitch/calls/getCurrentStream';
import { getCurrentStreamTags } from '~/services/twitch/calls/getCurrentStreamTags';
import { getLatest100Followers } from '~/services/twitch/calls/getLatest100Followers';
import { getModerators } from '~/services/twitch/calls/getModerators';
import { updateChannelViewsAndBroadcasterType } from '~/services/twitch/calls/updateChannelViewsAndBroadcasterType';

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
  getCurrentStream:                     getCurrentStream,
  getCurrentStreamTags:                 getCurrentStreamTags,
  updateChannelViewsAndBroadcasterType: updateChannelViewsAndBroadcasterType,
  getLatest100Followers:                getLatest100Followers,
  getChannelFollowers:                  getChannelFollowers,
  getChannelSubscribers:                getChannelSubscribers,
  getChannelChattersUnofficialAPI:      getChannelChattersUnofficialAPI,
  getChannelInformation:                getChannelInformation,
  checkClips:                           checkClips,
  getAllStreamTags:                     getAllStreamTags,
  getModerators:                        getModerators,
  getBannedEvents:                      getBannedEvents,
} as const;

export const init = () => {
  addInterval('getCurrentStream', constants.MINUTE);
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
};

export const stop = () => {
  intervals.clear();
};

let isBlocking: boolean | string = false;

const check = async () => {
  const botTokenValid = variable.get('services.twitch.botTokenValid') as string;
  const broadcasterTokenValid = variable.get('services.twitch.broadcasterTokenValid') as string;
  if (!botTokenValid || !broadcasterTokenValid) {
    debug('api.interval', 'Tokens not valid.');
    return;
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
      const[ botValidation, broadcasterValidation ] = await Promise.all([
        validate('bot'), validate('broadcaster'),
      ]);
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