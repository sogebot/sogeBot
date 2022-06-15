import { v4 } from 'uuid';

import { badgesCache } from '../services/twitch/calls/getChannelChatBadges';
import Overlay from './_interface';

import { timer } from '~/decorators';
import { onMessage } from '~/decorators/on';
import { ioServer } from '~/helpers/panel';
import { parseTextWithEmotes } from '~/helpers/parseTextWithEmotes';
import { adminEndpoint } from '~/helpers/socket';

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
          const badgeImage = badge.getVersion(message.sender.badges.get(messageBadgeId) as string)?.getImageUrl(1);
          if (badgeImage) {
            badgeImages.push({ url: badgeImage });
          }
        }
      }
      ioServer?.of('/overlays/chat').emit('message', {
        id:        v4(),
        timestamp: message.timestamp,
        username:  message.sender.displayName.toLowerCase() === message.sender.userName ? message.sender.displayName : `${message.sender.displayName} (${message.sender.userName})`,
        message:   data,
        show:      false,
        badges:    badgeImages,
      });
    });
  }

  sockets() {
    adminEndpoint('/overlays/chat', 'test', (data) => {
      this.withEmotes(data.message).then(message => {
        ioServer?.of('/overlays/chat').emit('message', {
          id:        v4(),
          timestamp: Date.now(),
          username:  data.username,
          message,
          show:      false,
        });
      });
    });
  }
}

export default new Chat();
