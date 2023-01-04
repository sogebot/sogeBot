'use strict';

import {
  command, default_permission, settings,
} from '../decorators';
import System from './_interface';

import { prepare } from '~/helpers/commons';
import defaultPermissions from '~/helpers/permissions/defaultPermissions';
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
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    if (twitch.tmi?.client.bot) {
      if(this.clearChat) {
        twitch.tmi.client.bot.clear(broadcasterUsername);
      }
      if (this.mode === modes.SUBSONLY) {
        twitch.tmi.client.bot.enableSubsOnly(broadcasterUsername);
      }
      if (this.mode === modes.FOLLOWONLY) {
        twitch.tmi.client.bot.enableFollowersOnly(broadcasterUsername, this.minFollowTime);
      }
      if (this.mode === modes.EMOTESONLY) {
        twitch.tmi.client.bot.enableEmoteOnly(broadcasterUsername);
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
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    if (twitch.tmi?.client.bot) {
      if (this.mode === modes.SUBSONLY) {
        twitch.tmi.client.bot.disableSubsOnly(broadcasterUsername);
      }
      if (this.mode === modes.FOLLOWONLY) {
        twitch.tmi.client.bot.disableFollowersOnly(broadcasterUsername);
      }
      if (this.mode === modes.EMOTESONLY) {
        twitch.tmi.client.bot.disableEmoteOnly(broadcasterUsername);
      }
    }
    return [];
  }
}

export default new AntiHateRaid();
