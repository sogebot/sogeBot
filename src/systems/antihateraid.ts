'use strict';

import System from './_interface';
import {
  command, default_permission, settings,
} from '../decorators';

import { prepare } from '~/helpers/commons';
import defaultPermissions from '~/helpers/permissions/defaultPermissions';
import getBotId from '~/helpers/user/getBotId';
import getBroadcasterId from '~/helpers/user/getBroadcasterId';
import twitch from '~/services/twitch';
import { variables } from '~/watchers';

enum modes {
  'SUBSONLY', 'FOLLOWONLY', 'EMOTESONLY'
}

class AntiHateRaid extends System {
  @settings()
    clearChat = true;
  @settings()
    mode: modes = modes.SUBSONLY;
  @settings()
    minFollowTime = 10;
  @settings()
    customAnnounce = '';

  @command('!antihateraidon')
  @default_permission(defaultPermissions.MODERATORS)
  async antihateraidon (opts: CommandOptions): Promise<CommandResponse[]> {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

    if(this.clearChat) {
      twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.moderation.deleteChatMessages(broadcasterId, broadcasterId));
    }
    if (this.mode === modes.SUBSONLY) {
      twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.chat.updateSettings(broadcasterId, broadcasterId, {
        subscriberOnlyModeEnabled: true,
      }));
    }
    if (this.mode === modes.FOLLOWONLY) {
      twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.chat.updateSettings(broadcasterId, broadcasterId, {
        followerOnlyModeEnabled: true,
      }));
    }
    if (this.mode === modes.EMOTESONLY) {
      twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.chat.updateSettings(broadcasterId, broadcasterId, {
        emoteOnlyModeEnabled: true,
      }));
    }
    return [{
      response: prepare(this.customAnnounce.length > 0 ? this.customAnnounce : prepare('systems.antihateraid.announce'), {
        username: opts.sender.userName, mode: prepare('systems.antihateraid.mode.' + this.mode),
      }, false), ...opts,
    }];
  }

  @command('!antihateraidoff')
  @default_permission(defaultPermissions.MODERATORS)
  async antihateraidoff () {
    if (this.mode === modes.SUBSONLY) {
      twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), getBotId(), {
        subscriberOnlyModeEnabled: false,
      }));
    }
    if (this.mode === modes.FOLLOWONLY) {
      twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), getBotId(), {
        followerOnlyModeEnabled: false,
      }));
    }
    if (this.mode === modes.EMOTESONLY) {
      twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.updateSettings(getBroadcasterId(), getBotId(), {
        emoteOnlyModeEnabled: false,
      }));
    }
    return [];
  }
}

export default new AntiHateRaid();
