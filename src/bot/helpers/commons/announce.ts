import { TextChannel } from 'discord.js';

import Discord from '../../integrations/discord';
import { Message } from '../../message';
import oauth from '../../oauth';
import { chatOut } from '../log';
import { getBotSender } from './getBotSender';
import { sendMessage } from './sendMessage';

/**
 * Announce in all channels (discord, twitch)
 * @param messageToAnnounce
 *
 * announce('Lorem Ipsum Dolor', 'timers);
 */
export const announceTypes = ['bets', 'duel', 'heist', 'timers', 'songs', 'scrim', 'raffles', 'polls', 'general'] as const;
export async function announce(messageToAnnounce: string, type: typeof announceTypes[number]) {
  messageToAnnounce = await new Message(messageToAnnounce).parse({ sender: getBotSender() }) as string;
  sendMessage(messageToAnnounce, {
    username: oauth.botUsername,
    displayName: oauth.botUsername,
    userId: oauth.botId,
    emotes: [],
    badges: {},
    'message-type': 'chat',
  }, { force: true, skip: true });

  if (Discord.sendAnnouncesToChannel[type].length > 0 && Discord.client) {
    // search discord channel by ID
    for (const [ id, channel ] of Discord.client.channels.cache) {
      if (channel.type === 'text') {
        if (id === Discord.sendAnnouncesToChannel[type] || (channel as TextChannel).name === Discord.sendAnnouncesToChannel[type]) {
          const ch = Discord.client.channels.cache.find(o => o.id === id);
          if (ch) {
            (ch as TextChannel).send(await Discord.replaceLinkedUsernameInMessage(messageToAnnounce));
            chatOut(`#${(ch as TextChannel).name}: ${messageToAnnounce} [${Discord.client.user?.tag}]`);
          }
        }
      }
    }
  }
}