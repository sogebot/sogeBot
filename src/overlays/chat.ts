import Overlay from './_interface.js';
import { badgesCache } from '../services/twitch/calls/getChannelChatBadges.js';

import { onMessage } from '~/decorators/on.js';
import { timer } from '~/decorators.js';
import { ioServer } from '~/helpers/panel.js';
import { parseTextWithEmotes } from '~/helpers/parseTextWithEmotes.js';

export const getBadgeImagesFromBadgeSet = (badgesMap: Map<string, string>) => {
  const badgeImages: {url: string }[] = [];
  for (const messageBadgeId of badgesMap.keys()) {
    const badge = badgesCache.find(o => o.id === messageBadgeId);
    if (badge) {
      const badgeImage = badge.getVersion(badgesMap.get(messageBadgeId) as string)?.getImageUrl(4);
      if (badgeImage) {
        badgeImages.push({ url: badgeImage });
      }
    }
  }
  return badgeImages;
};

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
      ioServer?.of('/overlays/chat').emit('message', {
        id:          message.id,
        timestamp:   message.timestamp,
        displayName: message.sender.displayName.toLowerCase() === message.sender.userName ? message.sender.displayName : `${message.sender.displayName} (${message.sender.userName})`,
        userName:    message.sender.userName,
        message:     data,
        show:        false,
        badges:      getBadgeImagesFromBadgeSet(message.sender.badges),
        color:       message.sender.color,
        service:     'twitch',
      });
    });
  }
}

export default new Chat();
