import { randomUUID } from 'crypto';

import axios from 'axios';
import { Request } from 'express';
import { z } from 'zod';

import Widget from './_interface.js';
import { timer } from '../decorators.js';
import { badgesCache } from '../services/twitch/calls/getChannelChatBadges.js';

import { Get, Post } from '~/decorators/endpoint.js';
import { onMessage, onStreamStart } from '~/decorators/on.js';
import { getOwnerAsSender, getUserSender } from '~/helpers/commons/index.js';
import { sendMessage } from '~/helpers/commons/sendMessage.js';
import { eventEmitter } from '~/helpers/events/emitter.js';
import { ioServer } from '~/helpers/panel.js';
import { parseTextWithEmotes } from '~/helpers/parseTextWithEmotes.js';
import { getIgnoreList } from '~/helpers/user/isIgnored.js';
import banUser from '~/services/twitch/calls/banUser.js';
import deleteChatMessages from '~/services/twitch/calls/deleteChatMessages.js';
import getUserByName from '~/services/twitch/calls/getUserByName.js';
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

  @onStreamStart()
  public streamStarted() {
    ioServer?.of('/widgets/chat').emit('bot-message', {
      id:          randomUUID(),
      timestamp:   Date.now(),
      displayName: ``,
      userName:    ``,
      message:     ``,
      show:        false,
      badges:      [],
      color:       [],
      service:     '@stream-started',
    });
  }

  public messageDeleted(msgId: string) {
    ioServer?.of('/widgets/chat').emit('message-removed', { msgId, id: randomUUID() });
  }

  @Post('/', {
    action:       'moderation',
    zodValidator: z.object({
      userName:  z.string(),
      type:      z.string(),
      timeout:   z.number().optional(),
      messageId: z.string().optional(),
    }),
  })
  async moderation(req: Request) {
    const user = await getUserByName(req.body.userName);
    if (!user) {
      return;
    }

    if (req.body.type === 'ban') {
      banUser(user.id);
    }

    if (req.body.type === 'timeout') {
      banUser(user.id, undefined, req.body.timeout ? req.body.timeout / 1000 : undefined);
    }

    if (req.body.type === 'delete') {
      deleteChatMessages(req.body.messageId);
    }

    if (req.body.type === 'autoban') {
      const moderation = await import('../systems/moderation.js');
      moderation.default.autoban({
        parameters:         user.name,
        command:            '!autoban',
        sender:             getOwnerAsSender(),
        emotesOffsets:      new Map(),
        isAction:           false,
        isHighlight:        false,
        isFirstTimeMessage: false,
        createdAt:          Date.now(),
        attr:               {},
        discord:            undefined,
      });
    }
  }
  @Post('/', {
    action: 'sendMessage',
  })
  async sendMessage(req: Request) {
    const botUsername = variables.get('services.twitch.botUsername') as string;
    const botId = variables.get('services.twitch.botId') as string;
    sendMessage(req.body.message, getUserSender(botId, botUsername), { force: true });
  }

  @Get('/room', { scope: 'public' })
  public getRoom() {
    return variables.get('services.twitch.broadcasterUsername').toLowerCase();
  }
  @Get('/viewers')
  async getViewers() {
    const url = `https://tmi.twitch.tv/group/user/${variables.get('services.twitch.broadcasterUsername').toLowerCase()}/chatters`;
    const response = await axios.get<{chatters: { viewers: string[] }}>(url);

    if (response.status === 200) {
      const chatters = response.data.chatters;
      chatters.viewers = chatters.viewers.filter((o) => !getIgnoreList().includes(o));
      return { chatters };
    }
  }

  public sockets() {
    eventEmitter.on('ban', (opts) => {
      ioServer?.of('/widgets/chat').emit('ban', { userName: opts.userName, id: randomUUID() });
    });
    eventEmitter.on('timeout', (opts) => {
      ioServer?.of('/widgets/chat').emit('ban', { userName: opts.userName, id: randomUUID() });
    });
  }
}

export default new Chat();
