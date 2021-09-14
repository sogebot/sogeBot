import { TextChannel } from 'discord.js';
import _ from 'lodash';

import { prepare } from './helpers/commons/prepare';
import { sendMessage } from './helpers/commons/sendMessage';
import { chatOut, warning } from './helpers/log';
import { generalChannel } from './helpers/oauth/generalChannel';
import Discord from './integrations/discord';
import { Message } from './message';

const isParserOpts = (opts: ParserOptions | { id?: undefined, sender: CommandOptions['sender']; attr?: CommandOptions['attr'] }): opts is ParserOptions => {
  return typeof opts.id !== 'undefined';
};

export async function parserReply(response: string | Promise<string>, opts: ParserOptions | { id?: undefined, sender: CommandOptions['sender']; attr?: CommandOptions['attr'] }, messageType: 'chat' | 'whisper' = 'chat') {
  if (!opts.sender) {
    return;
  }
  const senderObject = {
    ..._.cloneDeep(opts.sender),
    'message-type': messageType,
    forceWithoutAt: typeof opts.sender.discord !== 'undefined', // we dont need @
  };
  const messageToSend = await (async () => {
    const sender = senderObject.discord
      ? { ...senderObject, discord: { author: senderObject.discord.author, channel: senderObject.discord.channel } } : senderObject;
    if (isParserOpts(opts) ? opts.skip : opts.attr?.skip) {
      return prepare(await response as string, { ...opts, sender }, false);
    } else {
      return await new Message(await response as string).parse({ ...opts, sender }) as string;
    }
  })();
  if (opts.sender.discord) {
    if (Discord.client) {
      if (messageType === 'chat') {
        const msg = await opts.sender.discord.channel.send(messageToSend);
        chatOut(`#${(opts.sender.discord.channel as TextChannel).name}: ${messageToSend} [${Discord.client.user?.tag}]`);
        if (Discord.deleteMessagesAfterWhile) {
          setTimeout(() => {
            msg.delete().catch(() => {
              return;
            });
          }, 10000);
        }
      } else {
        opts.sender.discord.author.send(messageToSend);
      }
    } else {
      warning('Discord client is not connected');
    }
  } else {
    // we skip as we are already parsing message
    sendMessage(messageToSend, senderObject, { skip: true, ...(isParserOpts(opts) ? {} : opts.attr) });
  }
}

export function getChannel() {
  try {
    return generalChannel.value.toLowerCase().trim();
  } catch (e: any) {
    return '';
  }
}

/**
 * Return diff object
 * @param x timestamp ms
 * @param y timestamp ms
 */
export function dateDiff(x: number, y: number) {
  let diff;

  if (x > y) {
    diff = x - y;
  } else {
    diff = y - x;
  }

  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  diff = diff - (years * 1000 * 60 * 60 * 24 * 365);

  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  diff = diff - (months * 1000 * 60 * 60 * 24 * 30);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff = diff - (days * 1000 * 60 * 60 * 24);

  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff = diff - (hours * 1000 * 60 * 60);

  const minutes = Math.floor(diff / (1000 * 60));

  return {
    years,
    months,
    days,
    hours,
    minutes,
  };
}