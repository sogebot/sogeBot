import { ChannelType, TextChannel } from 'discord.js';

import { getUserSender } from './getUserSender.js';
import { chatOut } from '../log.js';
import getBotId from '../user/getBotId.js';
import getBotUserName from '../user/getBotUserName.js';

import { variables } from '~/watchers.js';

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
  const Discord = (await import('../../integrations/discord.js') as typeof import('../../integrations/discord')).default;
  const Message = (await import('../../message.js') as typeof import('../../message')).Message;
  const sendMessage = (await import('./sendMessage.js') as typeof import('./sendMessage')).sendMessage;

  messageToAnnounce = await new Message(messageToAnnounce).parse({ sender: getUserSender(getBotId(), getBotUserName()), replaceCustomVariables, discord: undefined }) as string;
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