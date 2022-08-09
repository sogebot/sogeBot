import { ChannelType, TextChannel } from 'discord.js';

import { chatOut } from '../log';
import { getBotSender } from './getBotSender';
import { getUserSender } from './getUserSender';

import { variables } from '~/watchers';

/**
 * Announce in all channels (discord, twitch)
 * @param messageToAnnounce
 *
 * announce('Lorem Ipsum Dolor', 'timers);
 */
export const announceTypes = ['bets', 'duel', 'heist', 'timers', 'songs', 'scrim', 'raffles', 'polls', 'general'] as const;
export async function announce(messageToAnnounce: string, type: typeof announceTypes[number], replaceCustomVariables = true) {
  const botUsername = variables.get('services.twitch.botUsername') as string;
  const botId = variables.get('services.twitch.botId') as string;

  // importing here as we want to get rid of import loops
  const Discord = (require('../../integrations/discord') as typeof import('../../integrations/discord')).default;
  const Message = (require('../../message') as typeof import('../../message')).Message;
  const sendMessage = (require('./sendMessage') as typeof import('./sendMessage')).sendMessage;

  messageToAnnounce = await new Message(messageToAnnounce).parse({ sender: getBotSender(), replaceCustomVariables, discord: undefined }) as string;
  sendMessage(messageToAnnounce, getUserSender(botId, botUsername), { force: true, skip: true });

  if (Discord.sendAnnouncesToChannel[type].length > 0 && Discord.client) {
    // search discord channel by ID
    for (const [ id, channel ] of Discord.client.channels.cache) {
      if (channel.type === ChannelType.GuildText) {
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