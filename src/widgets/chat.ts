import axios from 'axios';

import Widget from './_interface.js';
import { timer } from '../decorators.js';
import { badgesCache } from '../services/twitch/calls/getChannelChatBadges.js';

import { onMessage } from '~/decorators/on.js';
import { getUserSender } from '~/helpers/commons/index.js';
import { sendMessage } from '~/helpers/commons/sendMessage.js';
import { ioServer } from '~/helpers/panel.js';
import { parseTextWithEmotes } from '~/helpers/parseTextWithEmotes.js';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket.js';
import { getIgnoreList } from '~/helpers/user/isIgnored.js';
import { variables } from '~/watchers.js';

class Chat extends Widget {
  @timer()
  async withEmotes (text: string | undefined) {
    return parseTextWithEmotes(text);
  }

  @onMessage()
  message(message: onEventMessage) {
    this.withEmotes(message.message).then(data => {
      if (!message.sender) {
        return;
      }
      const badgeImages: {url: string, title: string }[] = [];
      for (const messageBadgeId of message.sender.badges.keys()) {
        const badge = badgesCache.find(o => o.id === messageBadgeId);
        if (badge) {
          const badgeImage = badge.getVersion(message.sender.badges.get(messageBadgeId) as string)?.getImageUrl(1);
          if (badgeImage) {
            let title = '';

            const badgeInfo = message.sender.badgeInfo.get(badge.id);
            if (badge.id === 'subscriber') {
              title = `${badgeInfo}-Month Subscriber`;
            } else if (badge.id === 'broadcaster') {
              title = 'Broadcaster';
            } else if (badgeInfo) {
              title = `${badgeInfo}`;
            }
            badgeImages.push({ url: badgeImage, title });
          }
        }
      }
      ioServer?.of('/widgets/chat').emit('message', {
        timestamp: message.timestamp,
        username:  message.sender.displayName.toLowerCase() === message.sender.userName ? message.sender.displayName : `${message.sender.displayName} (${message.sender.userName})`,
        message:   data,
        badges:    badgeImages,
      });
    });
  }

  public sockets() {
    adminEndpoint('/widgets/chat', 'chat.message.send', async (message) => {
      const botUsername = variables.get('services.twitch.botUsername') as string;
      const botId = variables.get('services.twitch.botId') as string;
      sendMessage(message, getUserSender(botId, botUsername), { force: true });
    });

    publicEndpoint('/widgets/chat', 'room', async (cb: (error: null, data: string) => void) => {
      const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
      cb(null, broadcasterUsername.toLowerCase());
    });

    adminEndpoint('/widgets/chat', 'viewers', async (cb) => {
      try {
        const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
        const url = `https://tmi.twitch.tv/group/user/${broadcasterUsername.toLowerCase()}/chatters`;
        const response = await axios.get<{chatters: { viewers: string[] }}>(url);

        if (response.status === 200) {
          const chatters = response.data.chatters;
          chatters.viewers = chatters.viewers.filter((o) => !getIgnoreList().includes(o));
          cb(null, { chatters });
        }
      } catch (e: any) {
        cb(e.message, { chatters: [] });
      }
    });
  }
}

export default new Chat();
