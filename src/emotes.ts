import { setImmediate } from 'timers';

import * as constants from '@sogebot/ui-helpers/constants';
import axios, { AxiosResponse } from 'axios';
import { shuffle } from 'lodash';
import { getManager, getRepository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import XRegExp from 'xregexp';

import Core from './_interface';
import { CacheEmotes, CacheEmotesInterface } from './database/entity/cacheEmotes';
import { parser } from './decorators';
import { onStartup } from './decorators/on';
import {
  debug,
  error, info, warning,
} from './helpers/log';
import { channelId } from './helpers/oauth';
import { ioServer } from './helpers/panel';
import { setImmediateAwait } from './helpers/setImmediateAwait';
import { adminEndpoint, publicEndpoint } from './helpers/socket';
import oauth from './oauth';

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

let broadcasterWarning = false;

class Emotes extends Core {
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
      } catch (e: any) {
        cb(e.stack, []);
      }
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
      if (oauth.broadcasterType === '' && !broadcasterWarning) {
        info(`EMOTES: Skipping fetching of ${cid} emotes - not subscriber/affiliate`);
        broadcasterWarning = true;
      } else {
        broadcasterWarning = false;
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
          const request = await axios.get<any>('https://api.twitch.tv/helix/chat/emotes?broadcaster_id=' + cid, {
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
        } catch (e: any) {
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
        const request = await axios.get<any>('https://api.twitch.tv/helix/chat/emotes/global', {
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
      } catch (e: any) {
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
        const request = await axios.get<any>('https://api.frankerfacez.com/v1/room/id/' + cid);

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
      } catch (e: any) {
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
        const request = await axios.get<any>('https://api.betterttv.net/2/channels/' + channel);

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
      } catch (e: any) {
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
    ioServer?.of('/core/emotes').emit('emote', {
      id:  uuid(),
      url: {
        1: 'https://static-cdn.jtvnw.net/emoticons/v1/9/1.0',
        2: 'https://static-cdn.jtvnw.net/emoticons/v1/9/2.0',
        3: 'https://static-cdn.jtvnw.net/emoticons/v1/9/3.0',
      },
    });
  }

  async firework (data: string[]) {
    const emotes = await this.parseEmotes(data);
    ioServer?.of('/core/emotes').emit('emote.firework', { emotes });
  }

  async explode (data: string[]) {
    const emotes = await this.parseEmotes(data);
    ioServer?.of('/core/emotes').emit('emote.explode', { emotes });
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
    const id = uuid();
    for (let i = 0; i < emotes.length; i++) {
      ioServer?.of('/core/emotes').emit('emote', { id, url: usedEmotes[emotes[i]].urls });
    }
    return true;
  }

  async parseEmotes (emotes: string[]) {
    const emotesArray: {1: string, 2: string, 3:string }[] = [];

    for (let i = 0, length = emotes.length; i < length; i++) {
      try {
        const items = await getRepository(CacheEmotes).find({ code: emotes[i] });
        if (items.length > 0) {
          emotesArray.push(items[0].urls);
        }
      } catch (e: any) {
        continue;
      }
    }
    return emotesArray;
  }
}

export default new Emotes();