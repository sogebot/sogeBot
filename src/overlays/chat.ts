import { v4 } from 'uuid';

import Overlay from './_interface.js';
import { badgesCache } from '../services/twitch/calls/getChannelChatBadges.js';

import { onMessage } from '~/decorators/on.js';
import { timer } from '~/decorators.js';
import { ioServer } from '~/helpers/panel.js';
import { parseTextWithEmotes } from '~/helpers/parseTextWithEmotes.js';
import { adminEndpoint } from '~/helpers/socket.js';

class Chat extends Overlay {
  showInUI = false;

  @timer()
  async withEmotes (text: string | undefined) {
    return parseTextWithEmotes(text, 3);
  }

  @onMessage()
  message(message: onEventMessage) {
    this.withEmotes(message.message).then(data => {
      if (!message.sender) {
        return;
      }
      const badgeImages: {url: string }[] = [];
      for (const messageBadgeId of message.sender.badges.keys()) {
        const badge = badgesCache.find(o => o.id === messageBadgeId);
        if (badge) {
          const badgeImage = badge.getVersion(message.sender.badges.get(messageBadgeId) as string)?.getImageUrl(4);
          if (badgeImage) {
            badgeImages.push({ url: badgeImage });
          }
        }
      }
      ioServer?.of('/overlays/chat').emit('message', {
        id:          v4(),
        timestamp:   message.timestamp,
        displayName: message.sender.displayName.toLowerCase() === message.sender.userName ? message.sender.displayName : `${message.sender.displayName} (${message.sender.userName})`,
        userName:    message.sender.userName,
        message:     data,
        show:        false,
        badges:      badgeImages,
        color:       message.sender.color,
      });
    });
  }

  sockets() {
    adminEndpoint('/overlays/chat', 'test', (data) => {
      this.withEmotes(data.message).then(message => {
        ioServer?.of('/overlays/chat').emit('message', {
          id:          v4(),
          timestamp:   Date.now(),
          displayName: data.username,
          userName:    data.username,
          message,
          show:        false,
          badges:      [],
        });
      });
    });
  }
}

export default new Chat();
