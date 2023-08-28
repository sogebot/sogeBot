import cronparser from 'cron-parser';
import { escapeRegExp } from 'lodash';

import { debug } from '~/helpers/log';

export enum Types {
  'Started',
  'Cron',
  'TwitchCommand',
  'TwitchMessage',
  'TwitchSubscription',
  'TwitchClearChat',
  'TwitchCheer',
  'TwitchGameChanged',
  'TwitchStreamStarted',
  'TwitchStreamStopped',
  'TwitchResub',
  'TwitchFollow',
  'TwitchRaid',
  'TwitchRewardRedeem',
  'TwitchSubgift',
  'TwitchSubcommunitygift',
  'GenericTip',
}

export const ListenToGenerator = (pluginId: string, type: Types, message: string, userstate: { userName: string, userId: string } | null, params?: Record<string, any>) => ({
  Bot: {
    started(callback: () => void) {
      if (type === Types.Started) {
        callback();
      }
    },
  },
  Cron(cron: string, callback: () => void) {
    if (type === Types.Cron) {
      const cronParsed = cronparser.parseExpression(cron);
      const cronDate = cronParsed.prev();
      const timestamp = Math.floor(cronDate.getTime() / 1000);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (timestamp === currentTimestamp) {
        callback();
      }
    }
  },
  Twitch: {
    onStreamStart: (callback: () => void) => {
      if (type === Types.TwitchStreamStarted) {
        callback();
      }
    },
    onStreamStop: (callback: () => void) => {
      if (type === Types.TwitchStreamStopped) {
        callback();
      }
    },
    onCategoryChange: (callback: (category: string, oldCategory: string) => void) => {
      if (type === Types.TwitchGameChanged) {
        callback(params?.category || '', params?.oldCategory || '');
      }
    },
    onChatClear: (callback: () => void) => {
      if (type === Types.TwitchClearChat) {
        callback();
      }
    },
    onCommand: (opts: { command: string }, callback: any) => {
      if (type === Types.TwitchCommand) {
        if (message.toLowerCase().startsWith(opts.command.toLowerCase())) {
          debug('plugins', `PLUGINS#${pluginId}: Twitch command executed`);
          const regexp = new RegExp(escapeRegExp(opts.command), 'i');
          callback(userstate, ...message.replace(regexp, '').trim().split(' ').filter(Boolean));
        }
      }
    },
    onCheer: (callback: any) => {
      if (type === Types.TwitchCheer) {
        callback(userstate, params?.amount ?? 0, message);
      }
    },
    onMessage: (callback: any) => {
      if (type === Types.TwitchMessage) {
        debug('plugins', `PLUGINS#${pluginId}: Twitch message executed`);
        callback(userstate, message);
      }
    },
    onFollow: (callback: any) => {
      if (type === Types.TwitchFollow) {
        callback(userstate);
      }
    },
    onRaid: (callback: any) => {
      if (type === Types.TwitchRaid) {
        callback(userstate, params);
      }
    },
    onRewardRedeem: (callback: any) => {
      if (type === Types.TwitchRewardRedeem) {
        callback(userstate, params);
      }
    },
    onResub: (callback: any) => {
      if (type === Types.TwitchResub) {
        callback(userstate, params);
      }
    },
    onSubscription: (callback: any) => {
      if (type === Types.TwitchSubscription) {
        callback(userstate, params);
      }
    },
    onSubGift: (callback: any) => {
      if (type === Types.TwitchSubgift) {
        callback(userstate, params);
      }
    },
    onSubCommunityGift: (callback: any) => {
      if (type === Types.TwitchSubcommunitygift) {
        callback(userstate, params);
      }
    },
  },
  Generic: {
    onTip: (callback: any) => {
      if (type === Types.GenericTip) {
        callback(userstate, message, params);
      }
    },
  },
});