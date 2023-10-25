import { rawDataSymbol } from '@twurple/common';
import _ from 'lodash-es';

import System from './_interface.js';
import {
  onStartup, onStreamStart,
} from '../decorators/on.js';
import {
  command, default_permission,
} from '../decorators.js';
import { Expects } from  '../expects.js';

import * as channelPoll from '~/helpers/api/channelPoll.js';
import { error } from '~/helpers/log.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import getBroadcasterId from '~/helpers/user/getBroadcasterId.js';
import twitch from '~/services/twitch.js';

enum ERROR {
  NOT_ENOUGH_OPTIONS,
  NO_VOTING_IN_PROGRESS,
  INVALID_VOTE_TYPE,
  INVALID_VOTE,
  ALREADY_OPENED,
  ALREADY_CLOSED,
}
let retryTimeout: NodeJS.Timeout | undefined;

/*
 * !poll open [-tips/-bits/-points] -title "your vote title" option | option | option
 * !poll close
 * !poll reuse
 */
class Polls extends System {
  @onStartup()
  @onStreamStart()
  async onStartup() {
    try {
      // initial load of polls
      const polls = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.polls.getPolls(getBroadcasterId()));
      if (polls) {
        const poll = polls?.data.find(o => o.status === 'ACTIVE');
        if (poll) {
          channelPoll.setData(poll[rawDataSymbol]);
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

  @command('!poll close')
  @default_permission(defaultPermissions.MODERATORS)
  public async close(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (channelPoll.event) {
        await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.polls.endPoll(getBroadcasterId(), channelPoll.event!.id, true));
      }
    } catch (e) {
      error(e);
    }
    return [];
  }

  @command('!poll reuse')
  @default_permission(defaultPermissions.MODERATORS)
  public async reuse(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const polls = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.polls.getPolls(getBroadcasterId()));
      if (polls) {
        const poll = polls?.data[0];

        await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.polls.createPoll(getBroadcasterId(), {
          choices:  poll.choices.map(o => o.title),
          duration: poll.durationInSeconds,
          title:    poll.title,
        }));
      }
    } catch (e) {
      error(e);
    }
    return [];
  }

  @command('!poll open')
  @default_permission(defaultPermissions.MODERATORS)
  public async open(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [duration, title, options] = new Expects(opts.parameters)
        .switch({
          name: 'duration', values: ['1', '2', '3', '5', '10'], optional: true, default: '5',
        })
        .argument({
          name: 'title', optional: false, multi: true,
        })
        .list({ delimiter: '|' })
        .toArray();
      if (options.length < 2) {
        throw new Error(String(ERROR.NOT_ENOUGH_OPTIONS));
      }

      await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.polls.createPoll(getBroadcasterId(), {
        choices:  options,
        duration: Number(duration) * 60, // in seconds
        title,
      }));
    } catch (e) {
      error(e);
    }
    return [];
  }
}

export default new Polls();