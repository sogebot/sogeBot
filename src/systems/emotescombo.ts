import * as constants from '@sogebot/ui-helpers/constants.js';

import System from './_interface.js';
import { parserReply } from '../commons.js';
import { parser, settings } from '../decorators.js';

import { onStreamStart } from '~/decorators/on.js';
import { prepare } from '~/helpers/commons/index.js';
import { ioServer } from '~/helpers/panel.js';
import { translate } from '~/translate.js';

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

  @onStreamStart()
  reset() {
    this.comboEmote = '';
    this.comboEmoteCount = 0;
    this.comboLastBreak = 0;
  }

  @parser({ priority: constants.LOW, fireAndForget: true })
  async containsEmotes (opts: ParserOptions) {
    if (!opts.sender || !this.enabled) {
      return true;
    }

    const Emotes = (await import('../emotes.js')).default;

    const parsed: string[] = [];
    const usedEmotes: { [code: string]: typeof Emotes.cache[number]} = {};

    if (opts.emotesOffsets) {
      // add emotes from twitch which are not maybe in cache (other partner emotes etc)
      for (const emoteId of opts.emotesOffsets.keys()) {
        // if emote is already in cache, continue
        const firstEmoteOffset = opts.emotesOffsets.get(emoteId)?.shift();
        if (!firstEmoteOffset) {
          continue;
        }
        const emoteCode = opts.message.slice(Number(firstEmoteOffset.split('-')[0]), Number(firstEmoteOffset.split('-')[1])+1);
        const emoteFromCache = Emotes.cache.find(o => o.code === emoteCode);
        if (!emoteFromCache) {
          const data = {
            type: 'twitch',
            code: emoteCode,
            urls: {
              '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emoteId + '/1.0',
              '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emoteId + '/2.0',
              '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emoteId + '/3.0',
            },
          } as const;

          // update emotes in cache
          Emotes.cache.push(data);
        }
      }
    }

    for (const potentialEmoteCode of opts.message.split(' ')) {
      if (parsed.includes(potentialEmoteCode)) {
        continue;
      } // this emote was already parsed
      parsed.push(potentialEmoteCode);

      const emoteFromCache = Emotes.cache.find(o => o.code === potentialEmoteCode);
      if (emoteFromCache) {
        for (let i = 0; i < opts.message.split(' ').filter(word => word === potentialEmoteCode).length; i++) {
          usedEmotes[potentialEmoteCode] = emoteFromCache;
        }
      }
    }

    if (Date.now() - this.comboLastBreak > this.comboCooldown * constants.SECOND) {
      const uniqueEmotes = Object.keys(usedEmotes);
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
                { ...opts, forbidReply: true },
              );
            }
          }
          this.comboEmoteCount = 1;
          this.comboEmote = uniqueEmotes[0];
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
                { ...opts, forbidReply: true },
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