import { TextChannel } from 'discord.js';

import { getUserSender } from '~/helpers/commons/index.js';
import { chatOut, error } from '~/helpers/log.js';
import getBotId from '~/helpers/user/getBotId.js';
import getBotUserName from '~/helpers/user/getBotUserName.js';

export const DiscordGenerator = (pluginId: string, fileName: string) => ({
  sendMessage: async (channelName: string, message: string) => {
    const Discord = (await import('../integrations/discord.js') as typeof import('../integrations/discord')).default;
    const Message = (await import('../message.js') as typeof import('../message')).Message;

    // remove # from channel name
    if (channelName.startsWith('#')) {
      channelName = channelName.slice(1);
    }

    message = await new Message(message).parse({ sender: getUserSender(getBotId(), getBotUserName()), replaceCustomVariables: true, discord: undefined }) as string;

    // search discord channel by ID
    if (Discord.client) {
      let channelFound = false;
      for (const [ id, channel ] of Discord.client.channels.cache) {
        if (id === channelName || (channel as TextChannel).name === channelName) {
          const ch = Discord.client.channels.cache.find(o => o.id === id);
          if (ch) {
            (ch as TextChannel).send(await Discord.replaceLinkedUsernameInMessage(message));
            chatOut(`#${(ch as TextChannel).name}: ${message} [${Discord.client.user?.tag}]`);
            channelFound = true;
            break;
          }
        }
      }
      if (!channelFound) {
        error(`PLUGINS#${pluginId}:./${fileName}: Channel not found: ${channelName}`);
      }
    } else {
      error(`PLUGINS#${pluginId}:./${fileName}: Discord client is not initialized`);
    }
  },
});