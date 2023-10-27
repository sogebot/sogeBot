import cronparser from 'cron-parser';
import { escapeRegExp } from 'lodash-es';

import { Events } from '~/helpers/events/emitter';
import { debug } from '~/helpers/log.js';

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
  'CustomVariableOnChange',
  'onChannelCharityCampaignProgress',
  'onChannelCharityCampaignStart',
  'onChannelCharityCampaignStop',
  'onChannelCharityDonation',
  'onChannelGoalBegin',
  'onChannelGoalEnd',
  'onChannelGoalProgress',
  'onChannelModeratorAdd',
  'onChannelModeratorRemove',
  'onChannelRewardAdd',
  'onChannelRewardRemove',
  'onChannelRewardUpdate',
  'onChannelShieldModeBegin',
  'onChannelShieldModeEnd',
  'onChannelShoutoutCreate',
  'onChannelShoutoutReceive',
  'onChannelUpdate',
  'onUserUpdate',
  'onChannelRaidFrom',
  'onChannelRedemptionUpdate',
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
    onChannelCharityCampaignStart: (callback: (args: Parameters<Events[Types.onChannelCharityCampaignStart]>[0]) => void) => {
      if (type === Types.onChannelCharityCampaignStart) {
        params && callback(params as Parameters<Events[Types.onChannelCharityCampaignStart]>[0]);
      }
    },
    onChannelCharityCampaignProgress: (callback: (args: Parameters<Events[Types.onChannelCharityCampaignProgress]>[0]) => void) => {
      if (type === Types.onChannelCharityCampaignProgress) {
        params && callback(params as Parameters<Events[Types.onChannelCharityCampaignProgress]>[0]);
      }
    },
    onChannelCharityCampaignStop: (callback: (args: Parameters<Events[Types.onChannelCharityCampaignStop]>[0]) => void) => {
      if (type === Types.onChannelCharityCampaignStop) {
        params && callback(params as Parameters<Events[Types.onChannelCharityCampaignStop]>[0]);
      }
    },
    onChannelCharityDonation: (callback: (args: Parameters<Events[Types.onChannelCharityDonation]>[0]) => void) => {
      if (type === Types.onChannelCharityDonation) {
        params && callback(params as Parameters<Events[Types.onChannelCharityDonation]>[0]);
      }
    },
    onChannelGoalBegin: (callback: (args: Parameters<Events[Types.onChannelGoalBegin]>[0]) => void) => {
      if (type === Types.onChannelGoalBegin) {
        params && callback(params as Parameters<Events[Types.onChannelGoalBegin]>[0]);
      }
    },
    onChannelGoalEnd: (callback: (args: Parameters<Events[Types.onChannelGoalEnd]>[0]) => void) => {
      if (type === Types.onChannelGoalEnd) {
        params && callback(params as Parameters<Events[Types.onChannelGoalEnd]>[0]);
      }
    },
    onChannelGoalProgress: (callback: (args: Parameters<Events[Types.onChannelGoalProgress]>[0]) => void) => {
      if (type === Types.onChannelGoalProgress) {
        params && callback(params as Parameters<Events[Types.onChannelGoalProgress]>[0]);
      }
    },
    onChannelModeratorAdd: (callback: (args: Parameters<Events[Types.onChannelModeratorAdd]>[0]) => void) => {
      if (type === Types.onChannelModeratorAdd) {
        params && callback(params as Parameters<Events[Types.onChannelModeratorAdd]>[0]);
      }
    },
    onChannelModeratorRemove: (callback: (args: Parameters<Events[Types.onChannelModeratorRemove]>[0]) => void) => {
      if (type === Types.onChannelModeratorRemove) {
        params && callback(params as Parameters<Events[Types.onChannelModeratorRemove]>[0]);
      }
    },
    onChannelRewardAdd: (callback: (args: Parameters<Events[Types.onChannelRewardAdd]>[0]) => void) => {
      if (type === Types.onChannelRewardAdd) {
        params && callback(params as Parameters<Events[Types.onChannelRewardAdd]>[0]);
      }
    },
    onChannelRewardRemove: (callback: (args: Parameters<Events[Types.onChannelRewardRemove]>[0]) => void) => {
      if (type === Types.onChannelRewardRemove) {
        params && callback(params as Parameters<Events[Types.onChannelRewardRemove]>[0]);
      }
    },
    onChannelRewardUpdate: (callback: (args: Parameters<Events[Types.onChannelRewardUpdate]>[0]) => void) => {
      if (type === Types.onChannelRewardUpdate) {
        params && callback(params as Parameters<Events[Types.onChannelRewardUpdate]>[0]);
      }
    },
    onChannelShieldModeBegin: (callback: (args: Parameters<Events[Types.onChannelShieldModeBegin]>[0]) => void) => {
      if (type === Types.onChannelShieldModeBegin) {
        params && callback(params as Parameters<Events[Types.onChannelShieldModeBegin]>[0]);
      }
    },
    onChannelShieldModeEnd: (callback: (args: Parameters<Events[Types.onChannelShieldModeEnd]>[0]) => void) => {
      if (type === Types.onChannelShieldModeEnd) {
        params && callback(params as Parameters<Events[Types.onChannelShieldModeEnd]>[0]);
      }
    },
    onChannelShoutoutCreate: (callback: (args: Parameters<Events[Types.onChannelShoutoutCreate]>[0]) => void) => {
      if (type === Types.onChannelShoutoutCreate) {
        params && callback(params as Parameters<Events[Types.onChannelShoutoutCreate]>[0]);
      }
    },
    onChannelShoutoutReceive: (callback: (args: Parameters<Events[Types.onChannelShoutoutReceive]>[0]) => void) => {
      if (type === Types.onChannelShoutoutReceive) {
        params && callback(params as Parameters<Events[Types.onChannelShoutoutReceive]>[0]);
      }
    },
    onChannelUpdate: (callback: (args: Parameters<Events[Types.onChannelUpdate]>[0]) => void) => {
      if (type === Types.onChannelUpdate) {
        params && callback(params as Parameters<Events[Types.onChannelUpdate]>[0]);
      }
    },
    onUserUpdate: (callback: (args: Parameters<Events[Types.onUserUpdate]>[0]) => void) => {
      if (type === Types.onUserUpdate) {
        params && callback(params as Parameters<Events[Types.onUserUpdate]>[0]);
      }
    },
    onChannelRaidFrom: (callback: (args: Parameters<Events[Types.onChannelRaidFrom]>[0]) => void) => {
      if (type === Types.onChannelRaidFrom) {
        params && callback(params as Parameters<Events[Types.onChannelRaidFrom]>[0]);
      }
    },
    onChannelRedemptionUpdate: (callback: (args: Parameters<Events[Types.onChannelRedemptionUpdate]>[0]) => void) => {
      if (type === Types.onChannelRedemptionUpdate) {
        params && callback(params as Parameters<Events[Types.onChannelRedemptionUpdate]>[0]);
      }
    },
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
  CustomVariable: {
    onChange: (variableName: string, callback: any) => {
      if (type === Types.CustomVariableOnChange) {
        if (variableName === params?.variableName) {
          debug('plugins', `PLUGINS#${pluginId}: CustomVariable:onChange executed`);
          callback(params?.cur, params?.prev);
        }
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