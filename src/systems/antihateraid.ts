'use strict';

import {
  command, default_permission, settings,
} from '../decorators';
import System from './_interface';

import { prepare } from '~/helpers/commons';
import defaultPermissions from '~/helpers/permissions/defaultPermissions';
import twitch from '~/services/twitch';
import client from '~/services/twitch/api/client';
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
    const apiClient = await client('broadcaster');

    if (twitch.tmi?.client.bot) {
      if(this.clearChat) {
        apiClient.moderation.deleteChatMessages(broadcasterId, broadcasterId);
      }
      if (this.mode === modes.SUBSONLY) {
        apiClient.chat.updateSettings(broadcasterId, broadcasterId, {
          subscriberOnlyModeEnabled: true,
        });
      }
      if (this.mode === modes.FOLLOWONLY) {
        apiClient.chat.updateSettings(broadcasterId, broadcasterId, {
          followerOnlyModeEnabled: true,
        });
      }
      if (this.mode === modes.EMOTESONLY) {
        apiClient.chat.updateSettings(broadcasterId, broadcasterId, {
          emoteOnlyModeEnabled: true,
        });
      }
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
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const apiClient = await client('broadcaster');

    if (this.mode === modes.SUBSONLY) {
      apiClient.chat.updateSettings(broadcasterId, broadcasterId, {
        subscriberOnlyModeEnabled: false,
      });
    }
    if (this.mode === modes.FOLLOWONLY) {
      apiClient.chat.updateSettings(broadcasterId, broadcasterId, {
        followerOnlyModeEnabled: false,
      });
    }
    if (this.mode === modes.EMOTESONLY) {
      apiClient.chat.updateSettings(broadcasterId, broadcasterId, {
        emoteOnlyModeEnabled: false,
      });
    }
    return [];
  }
}

export default new AntiHateRaid();
