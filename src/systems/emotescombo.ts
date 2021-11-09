import { CacheEmotes, CacheEmotesInterface } from '@entity/cacheEmotes';
import * as constants from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';
import { v4 } from 'uuid';
//import { v4 as uuid } from 'uuid';
import XRegExp from 'xregexp';

import { parserReply } from '../commons';
import { parser, settings } from '../decorators';
import System from './_interface';

import { prepare } from '~/helpers/commons';
import { ioServer } from '~/helpers/panel';
import { translate } from '~/translate';

interface EmotesCombo {
  id: string,
  name: string,
  images: {
    url_1x: string,
    url_2x: string,
    url_4x: string,
  },
}

class EmotesCombo extends System {
  @settings()
    comboCooldown = 0;
  @settings()
    comboMessageMinThreshold = 3;
  @settings()
    hypeMessagesEnabled = true;
  @settings()
    hypeMessages = [
      { messagesCount: 5, message: translate('ui.overlays.emotes.hype.5') },
      { messagesCount: 15, message: translate('ui.overlays.emotes.hype.15') },
    ];
  @settings()
    comboMessages = [
      { messagesCount: 3, message: translate('ui.overlays.emotes.message.3') },
      { messagesCount: 5, message: translate('ui.overlays.emotes.message.5') },
      { messagesCount: 10, message: translate('ui.overlays.emotes.message.10') },
      { messagesCount: 15, message: translate('ui.overlays.emotes.message.15') },
      { messagesCount: 20, message: translate('ui.overlays.emotes.message.20') },
    ];
  comboEmote = '';
  comboEmoteCount = 0;
  comboLastBreak = 0;

  @parser({ priority: constants.LOW, fireAndForget: true })
  async containsEmotes (opts: ParserOptions) {
    if (!opts.sender || opts.emotesOffsets.size === 0 || !this.enabled) {
      return true;
    }

    const parsed: string[] = [];
    const usedEmotes: { [code: string]: Readonly<Required<CacheEmotesInterface>>} = {};

    const cache = await getRepository(CacheEmotes).find();

    // add emotes from twitch which are not maybe in cache (other partner emotes etc)
    for (const emoteId of opts.emotesOffsets.keys()) {
      // if emote is already in cache, continue
      const firstEmoteOffset = opts.emotesOffsets.get(emoteId)?.shift();
      if (!firstEmoteOffset) {
        continue;
      }
      const emoteCode = opts.message.slice(Number(firstEmoteOffset.split('-')[0]), Number(firstEmoteOffset.split('-')[1])+1);

      if (cache.find((o) => o.code === emoteCode)) {
        continue;
      }
      const data: Required<CacheEmotesInterface> = {
        id:   v4(),
        type: 'twitch',
        code: emoteCode,
        urls: {
          '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emoteId + '/1.0',
          '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emoteId + '/2.0',
          '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emoteId + '/3.0',
        },
      };

      cache.push(data);

      // update emotes in cache
      await getRepository(CacheEmotes).save(data);

    }

    for (let j = 0, jl = cache.length; j < jl; j++) {
      const emote = cache[j];
      if (parsed.includes(emote.code)) {
        continue;
      } // this emote was already parsed
      for (let i = 0, length = (` ${opts.message} `.match(new RegExp('\\s*' + XRegExp.escape(emote.code) + '(\\s|\\b)', 'g')) || []).length; i < length; i++) {
        usedEmotes[emote.code] = emote;
        parsed.push(emote.code);
      }
    }

    if (Date.now() - this.comboLastBreak > this.comboCooldown * constants.SECOND) {
      const uniqueEmotes = [...new Set(parsed)];
      // we want to count only messages with emotes (skip text only)
      if (uniqueEmotes.length !== 0) {
        if (uniqueEmotes.length > 1 || (uniqueEmotes[0] !== this.comboEmote && this.comboEmote !== '')) {
          // combo breaker
          if (this.comboMessageMinThreshold <= this.comboEmoteCount) {
            this.comboLastBreak = Date.now();
            const message = this.comboMessages
              .sort((a, b) => a.messagesCount - b.messagesCount)
              .filter(o => o.messagesCount <= this.comboEmoteCount)
              .pop();
            if (message) {
            // send message about combo break
              parserReply(
                prepare(message.message, {
                  emote:  this.comboEmote,
                  amount: this.comboEmoteCount,
                }, false),
                opts,
              );
            }
          }
          this.comboEmoteCount = 0;
          this.comboEmote = '';
          ioServer?.of('/systems/emotescombo').emit('combo', { count: this.comboEmoteCount, url: null });
        } else {
          this.comboEmoteCount++;
          this.comboEmote = uniqueEmotes[0];

          if (this.hypeMessagesEnabled) {
            const message = this.hypeMessages
              .sort((a, b) => a.messagesCount - b.messagesCount)
              .find(o => o.messagesCount === this.comboEmoteCount);
            if (message) {
              parserReply(
                prepare(message.message, {
                  emote:  this.comboEmote,
                  amount: this.comboEmoteCount,
                }, false),
                opts,
              );
            }
          }
          ioServer?.of('/systems/emotescombo').emit('combo', { count: this.comboEmoteCount, url: usedEmotes[this.comboEmote].urls['3'] });
        }
      }
    }
    return true;
  }
}

export default new EmotesCombo();