import util from 'util';

import type { EventSubChannelCheerEventData } from '@twurple/eventsub-base/lib/events/EventSubChannelCheerEvent.external';

import eventlist from '../../overlays/eventlist.js';
import alerts from '../../registries/alerts.js';

import { eventEmitter } from './index.js';

import { parserReply } from '~/commons.js';
import { Price } from '~/database/entity/price.js';
import { UserBit, UserBitInterface } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { isStreamOnline, stats } from '~/helpers/api/index.js';
import { getUserSender } from '~/helpers/commons/getUserSender.js';
import { triggerInterfaceOnBit } from '~/helpers/interface/index.js';
import { cheer as cheerLog, debug, error } from '~/helpers/log.js';
import * as changelog from '~/helpers/user/changelog.js';
import { isIgnored } from '~/helpers/user/isIgnored.js';
import { Parser } from '~/parser.js';
import alias from '~/systems/alias.js';
import customcommands from '~/systems/customcommands.js';

export async function cheer(event: EventSubChannelCheerEventData) {
  try {
    const username = event.user_login;
    const userId = event.user_id;
    const message = event.message;
    const bits = event.bits;

    // remove <string>X or <string>X from message, but exclude from remove #<string>X or !someCommand2
    const messageFromUser = message.replace(/(?<![#!])(\b\w+[\d]+\b)/g, '').trim();
    if (!username || !userId || isIgnored({ userName: username, userId })) {
      return;
    }

    let user = await changelog.get(userId);
    if (!user) {
      // if we still doesn't have user, we create new
      changelog.update(userId, { userName: username });
      await changelog.flush();
      user = await changelog.get(userId);
    }

    eventlist.add({
      event:     'cheer',
      userId:    userId,
      bits,
      message:   messageFromUser,
      timestamp: Date.now(),
    });
    cheerLog(`${username}#${userId}, bits: ${bits}, message: ${messageFromUser}`);

    const newBits: UserBitInterface = {
      amount:    bits,
      cheeredAt: Date.now(),
      message:   messageFromUser,
      userId:    String(userId),
    };
    await AppDataSource.getRepository(UserBit).save(newBits);

    eventEmitter.emit('cheer', {
      userName: username, userId, bits: bits, message: messageFromUser,
    });

    if (isStreamOnline.value) {
      stats.value.currentBits = stats.value.currentBits + bits;
    }

    triggerInterfaceOnBit({
      userName:  username,
      amount:    bits,
      message:   messageFromUser,
      timestamp: Date.now(),
    });

    let redeemTriggered = false;
    if (messageFromUser.trim().startsWith('!')) {
      try {
        const price = await AppDataSource.getRepository(Price).findOneOrFail({ where: { command: messageFromUser.trim().toLowerCase(), enabled: true } });
        if (price.priceBits <= bits) {
          if (customcommands.enabled) {
            await customcommands.run({
              sender: getUserSender(userId, username), id: 'null', skip: true, quiet: false, message: messageFromUser.trim().toLowerCase(), parameters: '', parser: new Parser(), isAction: false, emotesOffsets: new Map(), isFirstTimeMessage: false, isHighlight: false, discord: undefined, isParserOptions: true,
            });
          }
          if (alias.enabled) {
            await alias.run({
              sender: getUserSender(userId, username), id: 'null', skip: true, message: messageFromUser.trim().toLowerCase(), parameters: '', parser: new Parser(), isAction: false, emotesOffsets: new Map(), isFirstTimeMessage: false, isHighlight: false, discord: undefined, isParserOptions: true,
            });
          }
          const responses = await new Parser().command(getUserSender(userId, username), messageFromUser, true);
          for (let i = 0; i < responses.length; i++) {
            await parserReply(responses[i].response, { sender: responses[i].sender, discord: responses[i].discord, attr: responses[i].attr, id: '' });
          }
          if (price.emitRedeemEvent) {
            redeemTriggered = true;
            debug('tmi.cmdredeems', messageFromUser);
            alerts.trigger({
              event:      'custom',
              recipient:  username,
              name:       price.command,
              amount:     bits,
              tier:       null,
              currency:   '',
              monthsName: '',
              message:    messageFromUser,
            });
          }
        }
      } catch (e: any) {
        debug('tmi.cheer', e.stack);
      }
    }
    if (!redeemTriggered) {
      alerts.trigger({
        event:      'cheer',
        name:       username,
        amount:     bits,
        tier:       null,
        currency:   '',
        monthsName: '',
        message:    messageFromUser,
      });
    }
  } catch (e: any) {
    error('Error parsing cheer event');
    error(util.inspect(event));
    error(e.stack);
  }
}