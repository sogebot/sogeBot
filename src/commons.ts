import { TextChannel } from 'discord.js';

import { timer } from '~/decorators.js';
import { prepare } from '~/helpers/commons/prepare.js';
import { sendMessage } from '~/helpers/commons/sendMessage.js';
import { chatOut, warning } from '~/helpers/log.js';
import Discord from '~/integrations/discord.js';
import { Message } from '~/message.js';

const isParserOpts = (opts: ParserOptions | { isParserOptions?: boolean, id: string, sender: CommandOptions['sender']; attr?: CommandOptions['attr'] }): opts is ParserOptions => {
  return typeof opts.isParserOptions !== 'undefined';
};

// We need to add it to class to be able to use @timer decorator
class Commons {
  @timer()
  async messageToSend(senderObject: any, response: string | Promise<string>, opts: ParserOptions | { isParserOptions?: boolean, id: string, discord: CommandOptions['discord']; sender: CommandOptions['sender']; attr?: CommandOptions['attr'] }): Promise<string> {
    const sender = opts.discord
      ? { ...senderObject, discord: { author: opts.discord.author, channel: opts.discord.channel } } : senderObject;
    if (isParserOpts(opts) ? opts.skip : opts.attr?.skip) {
      return prepare(await response as string, { ...opts, sender, forceWithoutAt: typeof opts.discord !== 'undefined' }, false);
    } else {
      return new Message(await response as string).parse({ ...opts, sender, forceWithoutAt: typeof opts.discord !== 'undefined' });
    }
  }

  @timer()
  async parserReply(response: string | Promise<string>, opts: ParserOptions | { isParserOptions?: boolean, id: string, discord: CommandOptions['discord'], sender: CommandOptions['sender']; attr?: CommandOptions['attr'] }, messageType: 'chat' | 'whisper' = 'chat') {
    if (!opts.sender) {
      return;
    }
    const messageToSend = await this.messageToSend(opts.sender, response, opts);
    if (opts.discord) {
      if (Discord.client) {
        if (messageType === 'chat') {
          const msg = await opts.discord.channel.send(messageToSend);
          chatOut(`#${(opts.discord.channel as TextChannel).name}: ${messageToSend} [${Discord.client.user?.tag}]`);
          if (Discord.deleteMessagesAfterWhile) {
            setTimeout(() => {
              msg.delete().catch(() => {
                return;
              });
            }, 10000);
          }
        } else {
          opts.discord.author.send(messageToSend);
        }
      } else {
        warning('Discord client is not connected');
      }
    } else {
      // we skip as we are already parsing message
      sendMessage(messageToSend, opts.sender, { skip: true, ...(isParserOpts(opts) ? {} : opts.attr ) }, isParserOpts(opts) && opts.forbidReply ? undefined : opts.id);
    }
  }
}
const commons = new Commons();

export async function parserReply(response: string | Promise<string>, opts: ParserOptions | { isParserOptions?: boolean, id: string, sender: CommandOptions['sender'];  discord: CommandOptions['discord']; attr?: CommandOptions['attr'] }, messageType: 'chat' | 'whisper' = 'chat') {
  commons.parserReply(response, opts, messageType);
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