import _ from 'lodash-es';

import System from './_interface.js';
import {
  command, default_permission,
} from '../decorators.js';
import { Expects } from  '../expects.js';

import { onStartup, onStreamStart } from '~/decorators/on.js';
import * as channelPrediction from '~/helpers/api/channelPrediction.js';
import {
  prepare,
} from '~/helpers/commons/index.js';
import { error } from '~/helpers/log.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import twitch from '~/services/twitch.js';

const ERROR_NOT_ENOUGH_OPTIONS = 'Expected more parameters';
const ERROR_NOT_OPTION = '7';
let retryTimeout: NodeJS.Timeout | undefined;

/*
 * !bet open [-timeout 5] -title "your bet title" option | option | option | ... - open a new bet with selected options
 *                                                                               - -timeout in seconds - optional: default 120
 *                                                                               - -title - must be in "" - optional
 * !bet close [option]                                                           - close a bet and select option as winner
 * !bet reuse                                                                    - reuse latest bet
 * !bet lock                                                                     - lock current bet
 */
class Bets extends System {
  @onStartup()
  @onStreamStart()
  async onStartup() {
    try {
      // initial load of predictions
      const predictions = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.predictions.getPredictions(getBroadcasterId()));
      if (predictions) {
        const prediction = predictions?.data.find(o => o.status === 'ACTIVE' || o.status === 'LOCKED');
        if (prediction) {
          channelPrediction.status(prediction);
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('not found in auth provider')) {
        clearTimeout(retryTimeout);
        retryTimeout = setTimeout(() => this.onStartup(), 10000);
      } else {
        throw e;
      }
    }
  }

  @command('!bet open')
  @default_permission(defaultPermissions.MODERATORS)
  public async open(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [timeout, title, options] = new Expects(opts.parameters)
        .argument({
          name: 'timeout', optional: true, default: 120, type: Number,
        })
        .argument({
          name: 'title', optional: false, multi: true,
        })
        .list({ delimiter: '|' })
        .toArray() as [number, string, string[]];
      if (options.length < 2) {
        throw new Error(ERROR_NOT_ENOUGH_OPTIONS);
      }

      await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.predictions.createPrediction(getBroadcasterId(), {
        title,
        outcomes:      options,
        autoLockAfter: timeout,
      }));

      return [];
    } catch (e: any) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          return [{ response: prepare('bets.notEnoughOptions'), ...opts }];
        default:
          throw(e);
      }
    }
  }

  @command('!bet lock')
  @default_permission(defaultPermissions.MODERATORS)
  public async lock(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      await twitch.apiClient?.asIntent(['broadcaster'],
        ctx => ctx.predictions.lockPrediction(getBroadcasterId(), channelPrediction.status()!.id));
    } catch (e: any) {
      error(e);
    }
    return [];
  }

  @command('!bet reuse')
  @default_permission(defaultPermissions.MODERATORS)
  public async reuse(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const predictions = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.predictions.getPredictions(getBroadcasterId()));
      if (predictions) {
        const prediction = predictions?.data[0];

        await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.predictions.createPrediction(getBroadcasterId(), {
          outcomes:      prediction.outcomes.map(o => o.title),
          autoLockAfter: prediction.autoLockAfter,
          title:         prediction.title,
        }));
      }
    } catch (e) {
      error(e);
    }
    return [];
  }

  @command('!bet close')
  @default_permission(defaultPermissions.MODERATORS)
  public async close(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const index = new Expects(opts.parameters).number().toArray()[0];
      if (channelPrediction.status()) {
        const outcome = channelPrediction.status()?.outcomes[index];
        if (!outcome) {
          throw new Error(ERROR_NOT_OPTION);
        }
        await twitch.apiClient?.asIntent(['broadcaster'],
          ctx => ctx.predictions.resolvePrediction(getBroadcasterId(), channelPrediction.status()!.id, outcome.id));
      }
    } catch (e: any) {
      error(e);
    }
    return [];
  }
}

const bets = new Bets();
export default bets;
