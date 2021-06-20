import { setImmediate } from 'timers';

import axios, { AxiosResponse } from 'axios';
import { shuffle } from 'lodash';
import { getManager, getRepository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import XRegExp from 'xregexp';

import { parserReply } from '../commons';
import * as constants from '../constants';
import { CacheEmotes, CacheEmotesInterface } from '../database/entity/cacheEmotes';
import {
  parser, settings, ui,
} from '../decorators';
import { onStartup } from '../decorators/on';
import { prepare } from '../helpers/commons';
import {
  debug,
  error, info, warning,
} from '../helpers/log';
import { channelId } from '../helpers/oauth';
import { ioServer } from '../helpers/panel';
import { setImmediateAwait } from '../helpers/setImmediateAwait';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import oauth from '../oauth';
import { translate } from '../translate';
import Overlay from './_interface';

interface EmotesCommons {
  id: string,
  name: string,
  images: {
    url_1x: string,
    url_2x: string,
    url_4x: string,
  },
}

interface GlobalEmotesEndpoint { data: EmotesCommons[]}

interface ChannelEmotesEndpoint { data: (EmotesCommons & {
  tier: string,
  emote_type: 'subscriptions' | 'bitstier' | 'follower',
  emote_set_id: string,
})[]}

class Emotes extends Overlay {
  fetch = {
    global:  false,
    channel: false,
    ffz:     false,
    bttv:    false,
  };

  lastGlobalEmoteChk = 0;
  lastSubscriberEmoteChk = 0;
  lastChannelChk: string | null = null;
  lastFFZEmoteChk = 0;
  lastBTTVEmoteChk = 0;

  @settings('customization')
  @ui({ type: 'selector', values: ['1', '2', '3'] })
  cEmotesSize: 1 | 2 | 3 = 1;
  @settings('customization')
  cEmotesMaxEmotesPerMessage = 5;
  @settings('customization')
  @ui({ type: 'selector', values: ['fadeup', 'fadezoom', 'facebook'] })
  cEmotesAnimation: 'fadeup' | 'fadezoom' | 'facebook' = 'fadeup';
  @settings('customization')
  cEmotesAnimationTime = 1000;

  @settings('explosion')
  @ui({
    type: 'number-input', step: '1', min: '1',
  })
  cExplosionNumOfEmotes = 20;

  @settings('fireworks')
  @ui({
    type: 'number-input', step: '1', min: '1',
  })
  cExplosionNumOfEmotesPerExplosion = 10;
  @settings('fireworks')
  @ui({
    type: 'number-input', step: '1', min: '1',
  })
  cExplosionNumOfExplosions = 5;

  @ui({
    type: 'btn-emit', class: 'btn btn-secondary btn-block mt-1 mb-1', emit: 'testExplosion',
  }, 'test')
  btnTestExplosion = null;
  @ui({
    type: 'btn-emit', class: 'btn btn-secondary btn-block mt-1 mb-1', emit: 'test',
  }, 'test')
  btnTestEmote = null;
  @ui({
    type: 'btn-emit', class: 'btn btn-secondary btn-block mt-1 mb-1', emit: 'testFireworks',
  }, 'test')
  btnTestFirework = null;
  @ui({
    type: 'btn-emit', class: 'btn btn-danger btn-block mt-1 mb-1', emit: 'removeCache',
  }, 'emotes')
  btnRemoveCache = null;

  @settings('emotes_combo')
  enableEmotesCombo = false;
  @settings('emotes_combo')
  showEmoteInOverlayThreshold = 3;
  @settings('emotes_combo')
  hideEmoteInOverlayAfter = 30;
  @settings('emotes_combo')
  comboCooldown = 0;
  @settings('emotes_combo')
  comboMessageMinThreshold = 3;
  @settings('emotes_combo')
  @ui({ type: 'emote-combo' }, 'emotes_combo')
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

  @onStartup()
  onStartup() {
    setInterval(() => {
      if (!this.fetch.global) {
        this.fetchEmotesGlobal();
      }
      if (!this.fetch.channel) {
        this.fetchEmotesChannel();
      }
      if (!this.fetch.ffz) {
        this.fetchEmotesFFZ();
      }
      if (!this.fetch.bttv) {
        this.fetchEmotesBTTV();
      }
    }, 1000);
  }

  sockets () {
    publicEndpoint(this.nsp, 'getCache', async (cb) => {
      try {
        cb(null, await getRepository(CacheEmotes).find());
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'removeCache', (cb) => {
      this.removeCache();
      cb(null, null);
    });
    adminEndpoint(this.nsp, 'testExplosion', (cb) => {
      this._testExplosion();
      cb(null, null);
    });
    adminEndpoint(this.nsp, 'testFireworks', (cb) => {
      this._testFireworks();
      cb(null, null);
    });
    adminEndpoint(this.nsp, 'test', (cb) => {
      this._test();
      cb(null, null);
    });
  }

  async removeCache () {
    this.lastGlobalEmoteChk = 0;
    this.lastSubscriberEmoteChk = 0;
    this.lastFFZEmoteChk = 0;
    this.lastBTTVEmoteChk = 0;
    await getManager().clear(CacheEmotes);

    if (!this.fetch.global) {
      this.fetchEmotesGlobal();
    }
    if (!this.fetch.channel) {
      this.fetchEmotesChannel();
    }
    if (!this.fetch.ffz) {
      this.fetchEmotesFFZ();
    }
    if (!this.fetch.bttv) {
      this.fetchEmotesBTTV();
    }
  }

  async fetchEmotesChannel () {
    const cid = channelId.value;
    this.fetch.channel = true;

    if (cid && oauth.broadcasterType !== null && (Date.now() - this.lastSubscriberEmoteChk > 1000 * 60 * 60 * 24 * 7 || this.lastChannelChk !== cid)) {
      if (oauth.broadcasterType === '') {
        info(`EMOTES: Skipping fetching of ${cid} emotes - not subscriber/affiliate`);
      } else {
        this.lastSubscriberEmoteChk = Date.now();
        this.lastChannelChk = cid;
        try {
          await oauth.validateOAuth('bot');
          const token = oauth.botAccessToken;
          if (!token) {
            this.lastSubscriberEmoteChk = 0; // recheck next tick
            this.fetch.channel = false;
            return;
          }
          info(`EMOTES: Fetching channel ${cid} emotes`);
          const request = await axios.get('https://api.twitch.tv/helix/chat/emotes?broadcaster_id=' + cid, {
            headers: {
              'Authorization': 'Bearer ' + token,
              'Client-ID':     oauth.botClientId,
            },
            timeout: 20000,
          }) as AxiosResponse<ChannelEmotesEndpoint>;
          const emotes = request.data.data;
          for (const emote of emotes) {
            debug('emotes.channel', `Saving to cache ${emote.name}#${emote.id}`);
            await getRepository(CacheEmotes).save({
              code: emote.name,
              type: 'twitch',
              urls: {
                '1': emote.images.url_1x,
                '2': emote.images.url_2x,
                '3': emote.images.url_4x,
              },
            });
          }
          info(`EMOTES: Fetched channel ${cid} emotes`);
        } catch (e) {
          if (String(e).includes('404')) {
            error(`EMOTES: Error fetching channel ${cid} emotes. Your channel was not found on twitchemotes.com. Add your channel at https://twitchemotes.com/contact/tip`);
          } else {
            error(e);
            error(e.stack);
          }
        }
      }
    }
    this.fetch.channel = false;
  }

  async fetchEmotesGlobal () {
    this.fetch.global = true;

    // we want to update once every week
    if (Date.now() - this.lastGlobalEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      this.lastGlobalEmoteChk = Date.now();
      try {
        await oauth.validateOAuth('bot');
        const token = oauth.botAccessToken;
        if (!token) {
          this.lastGlobalEmoteChk = 0; // recheck next tick
          this.fetch.global = false;
          return;
        }
        info('EMOTES: Fetching global emotes');
        const request = await axios.get('https://api.twitch.tv/helix/chat/emotes/global', {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Client-ID':     oauth.botClientId,
          },
          timeout: 20000,
        }) as AxiosResponse<GlobalEmotesEndpoint>;
        const emotes = request.data.data;
        for (const emote of emotes) {
          await setImmediateAwait();
          debug('emotes.global', `Saving to cache ${emote.name}#${emote.id}`);
          await getRepository(CacheEmotes).save({
            code: emote.name,
            type: 'twitch',
            urls: {
              '1': emote.images.url_1x,
              '2': emote.images.url_2x,
              '3': emote.images.url_4x,
            },
          });
        }
        info('EMOTES: Fetched global emotes');
      } catch (e) {
        error(e);
        error(e.stack);
      }
    }

    this.fetch.global = false;
  }

  async fetchEmotesFFZ () {
    const cid = channelId.value;
    const channel = oauth.currentChannel;

    if (channel.length === 0) {
      setImmediate(() => this.fetchEmotesFFZ());
      return;
    }
    this.fetch.ffz = true;

    // fetch FFZ emotes
    if (cid && Date.now() - this.lastFFZEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      info('EMOTES: Fetching ffz emotes');
      this.lastFFZEmoteChk = Date.now();
      try {
        const request = await axios.get('https://api.frankerfacez.com/v1/room/id/' + cid);

        const emoteSet = request.data.room.set;
        const emotes = request.data.sets[emoteSet].emoticons;

        for (let i = 0, length = emotes.length; i < length; i++) {
          // change 4x to 3x, to be same as Twitch and BTTV
          emotes[i].urls['3'] = emotes[i].urls['4']; delete emotes[i].urls['4'];
          const cachedEmote = (await getRepository(CacheEmotes).findOne({ code: emotes[i].code, type: 'ffz' }));
          await getRepository(CacheEmotes).save({
            ...cachedEmote,
            code: emotes[i].name,
            type: 'ffz',
            urls: emotes[i].urls,
          });
        }
        info('EMOTES: Fetched ffz emotes');
      } catch (e) {
        if (e.response.status === 404) {
          warning(`EMOTES: Channel ${channel} not found in ffz`);
        } else {
          error(e);
        }
      }

      this.fetch.ffz = false;
    }
  }

  async fetchEmotesBTTV () {
    const channel = oauth.currentChannel;

    if (channel.length === 0) {
      setImmediate(() => this.fetchEmotesFFZ());
      return;
    }

    this.fetch.bttv = true;

    // fetch BTTV emotes
    if (channel && Date.now() - this.lastBTTVEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      info('EMOTES: Fetching bttv emotes');
      this.lastBTTVEmoteChk = Date.now();
      try {
        const request = await axios.get('https://api.betterttv.net/2/channels/' + channel);

        const urlTemplate = request.data.urlTemplate;
        const emotes = request.data.emotes;

        for (let i = 0, length = emotes.length; i < length; i++) {
          const cachedEmote = (await getRepository(CacheEmotes).findOne({ code: emotes[i].code, type: 'bttv' }));
          await getRepository(CacheEmotes).save({
            ...cachedEmote,
            code: emotes[i].code,
            type: 'bttv',
            urls: {
              '1': urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '1x'),
              '2': urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '2x'),
              '3': urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '3x'),
            },
          });
        }
        info('EMOTES: Fetched bttv emotes');
      } catch (e) {
        if (e.response.status === 404) {
          warning(`EMOTES: Channel ${channel} not found in bttv`);
        } else {
          error(e);
        }
      }
    }

    this.fetch.bttv = false;
  }

  async _testFireworks () {
    this.firework(['Kappa', 'GivePLZ', 'PogChamp']);
  }

  async _testExplosion () {
    this.explode(['Kappa', 'GivePLZ', 'PogChamp']);
  }

  async _test () {
    ioServer?.of('/overlays/emotes').emit('emote', {
      url:      'https://static-cdn.jtvnw.net/emoticons/v1/9/' + this.cEmotesSize + '.0',
      settings: {
        emotes: {
          animation:     this.cEmotesAnimation,
          animationTime: this.cEmotesAnimationTime,
        },
      },
    });
  }

  async firework (data: string[]) {
    const emotes = await this.parseEmotes(data);
    ioServer?.of('/overlays/emotes').emit('emote.firework', {
      emotes,
      settings: {
        emotes:    { animationTime: this.cEmotesAnimationTime },
        fireworks: {
          numOfEmotesPerExplosion: this.cExplosionNumOfEmotesPerExplosion,
          numOfExplosions:         this.cExplosionNumOfExplosions,
        },
      },
    });
  }

  async explode (data: string[]) {
    const emotes = await this.parseEmotes(data);
    ioServer?.of('/overlays/emotes').emit('emote.explode', {
      emotes,
      settings: {
        emotes:    { animationTime: this.cEmotesAnimationTime },
        explosion: { numOfEmotes: this.cExplosionNumOfEmotes },
      },
    });
  }

  @parser({ priority: constants.LOW, fireAndForget: true })
  async containsEmotes (opts: ParserOptions) {
    if (!opts.sender || !Array.isArray(opts.sender.emotes)) {
      return true;
    }

    const parsed: string[] = [];
    const usedEmotes: { [code: string]: Readonly<Required<CacheEmotesInterface>>} = {};

    const cache = await getRepository(CacheEmotes).find();

    // add emotes from twitch which are not maybe in cache (other partner emotes etc)
    for (const emote of opts.sender.emotes) {
      // if emote is already in cache, continue
      const emoteCode = opts.message.slice(emote.start, emote.end+1);
      if (cache.find((o) => o.code === emoteCode)) {
        continue;
      }
      const data: Required<CacheEmotesInterface> = {
        id:   uuid(),
        type: 'twitch',
        code: opts.message.slice(emote.start, emote.end+1),
        urls: {
          '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote.id + '/1.0',
          '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote.id + '/2.0',
          '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote.id + '/3.0',
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

    const emotes = shuffle(parsed);
    for (let i = 0; i < this.cEmotesMaxEmotesPerMessage && i < emotes.length; i++) {
      ioServer?.of('/overlays/emotes').emit('emote', {
        url:      usedEmotes[emotes[i]].urls[this.cEmotesSize],
        settings: {
          emotes: {
            animation:     this.cEmotesAnimation,
            animationTime: this.cEmotesAnimationTime,
          },
        },
      });
    }

    if (this.enableEmotesCombo && Date.now() - this.comboLastBreak > this.comboCooldown * constants.SECOND) {
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
          ioServer?.of('/overlays/emotes').emit('combo', {
            count: this.comboEmoteCount, url: null, threshold: this.showEmoteInOverlayThreshold, inactivity: this.hideEmoteInOverlayAfter,
          });
        } else {
          this.comboEmoteCount++;
          this.comboEmote = uniqueEmotes[0];
          ioServer?.of('/overlays/emotes').emit('combo', {
            count: this.comboEmoteCount, url: usedEmotes[this.comboEmote].urls['3'], threshold: this.showEmoteInOverlayThreshold, inactivity: this.hideEmoteInOverlayAfter,
          });
        }
      }
    }
    return true;
  }

  async parseEmotes (emotes: string[]) {
    const emotesArray: string[] = [];

    for (let i = 0, length = emotes.length; i < length; i++) {
      try {
        const items = await getRepository(CacheEmotes).find({ code: emotes[i] });
        if (items.length > 0) {
          emotesArray.push(items[0].urls[this.cEmotesSize]);
        }
      } catch (e) {
        continue;
      }
    }
    return emotesArray;
  }
}

export default new Emotes();