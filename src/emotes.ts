import { shuffle } from '@sogebot/ui-helpers/array.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import axios from 'axios';
import { v4 as uuid } from 'uuid';

import { onStartup } from './decorators/on.js';
import emitter from './helpers/interfaceEmitter.js';
import { adminEndpoint, publicEndpoint } from './helpers/socket.js';
import getBroadcasterId from './helpers/user/getBroadcasterId.js';
import twitch from './services/twitch.js';

import Core from '~/_interface.js';
import { parser, settings } from '~/decorators.js';
import {
  debug,
  error, info, warning,
} from '~/helpers/log.js';
import { ioServer } from '~/helpers/panel.js';
import { setImmediateAwait } from '~/helpers/setImmediateAwait.js';
import { variables } from '~/watchers.js';

let broadcasterWarning = false;

class Emotes extends Core {
  cache: {
    code: string;
    type: 'twitch' | 'twitch-sub' | 'ffz' | 'bttv' | '7tv';
    urls: { '1': string; '2': string; '3': string };
  }[] = [];

  @settings()
    '7tvEmoteSet' = '';
  @settings()
    ffz = true;
  @settings()
    bttv = true;

  fetch = {
    global:     false,
    channel:    false,
    ffz:        false,
    bttv:       false,
    globalBttv: false,
    '7tv':      false,
  };

  lastGlobalEmoteChk = 1;
  lastSubscriberEmoteChk = 1;
  lastChannelChk: string | null = null;
  lastFFZEmoteChk = 1;
  lastBTTVEmoteChk = 1;
  lastGlobalBTTVEmoteChk = 1;
  last7TVEmoteChk = 1;

  interval: NodeJS.Timer;

  get types() {
    const types: Emotes['cache'][number]['type'][] = ['twitch', 'twitch-sub'];
    if (this['7tvEmoteSet'].length > 0) {
      types.push('7tv');
    }
    if (this.bttv) {
      types.push('bttv');
    }
    if (this.ffz) {
      types.push('ffz');
    }
    return types;
  }

  @onStartup()
  onStartup() {
    publicEndpoint('/core/emotes', 'getCache', async (cb) => {
      try {
        cb(null, this.cache.filter(o => this.types.includes(o.type)));
      } catch (e: any) {
        cb(e.stack, []);
      }
    });

    adminEndpoint('/core/emotes', 'testExplosion', (cb) => {
      this._testExplosion();
      cb(null, null);
    });
    adminEndpoint('/core/emotes', 'testFireworks', (cb) => {
      this._testFireworks();
      cb(null, null);
    });
    adminEndpoint('/core/emotes', 'test', (cb) => {
      this._test();
      cb(null, null);
    });
    adminEndpoint('/core/emotes', 'removeCache', (cb) => {
      this.removeCache();
      cb(null, null);
    });

    emitter.on('services::twitch::emotes', (type, value) => {
      if (type === 'explode') {
        this.explode(value);
      }
      if (type === 'firework') {
        this.firework(value);
      }
    });

    this.interval = setInterval(() => {
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
      if (!this.fetch.globalBttv) {
        this.fetchEmotesGlobalBTTV();
      }
      if (!this.fetch['7tv']) {
        this.fetchEmotes7TV();
      }
    }, 10000);
  }

  async removeCache () {
    this.lastGlobalEmoteChk = 0;
    this.lastSubscriberEmoteChk = 0;
    this.lastFFZEmoteChk = 0;
    this.last7TVEmoteChk = 0;
    this.lastBTTVEmoteChk = 0;
    this.cache = [];

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
    if (!this.fetch.globalBttv) {
      this.fetchEmotesGlobalBTTV();
    }
    if (!this.fetch['7tv']) {
      this.fetchEmotes7TV();
    }
  }

  async fetchEmotesChannel () {
    this.fetch.channel = true;

    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const broadcasterType = variables.get('services.twitch.broadcasterType') as string;

    if (broadcasterId && broadcasterType !== null && (Date.now() - this.lastSubscriberEmoteChk > 1000 * 60 * 60 * 24 * 7 || this.lastChannelChk !== broadcasterId)) {
      if (broadcasterType === '' && !broadcasterWarning) {
        info(`EMOTES: Skipping fetching of ${broadcasterId} emotes - not subscriber/affiliate`);
        broadcasterWarning = true;
      } else {
        this.lastChannelChk = broadcasterId;
        try {
          if (this.lastGlobalEmoteChk !== 0) {
            info(`EMOTES: Fetching channel ${broadcasterId} emotes`);
          }
          const emotes = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.callApi<any>({ url: `chat/emotes?broadcaster_id=${broadcasterId}`, type: 'helix' }));
          if (!emotes) {
            throw new Error('not found in auth provider');
          }
          this.lastSubscriberEmoteChk = Date.now();
          this.cache = this.cache.filter(o => o.type !== 'twitch-sub');
          for (const emote of emotes.data) {
            debug('emotes.channel', `Saving to cache ${emote.name}#${emote.id}`);
            const template = emotes.template
              .replace('{{id}}', emote.id)
              .replace('{{format}}', emote.format.includes('animated') ? 'animated' : 'static')
              .replace('{{theme_mode}}', 'dark');
            this.cache.push({
              code: emote.name,
              type: 'twitch',
              urls: {
                '1': template.replace('{{scale}}', '1.0'),
                '2': template.replace('{{scale}}', '2.0'),
                '3': template.replace('{{scale}}', '3.0'),
              },
            });
          }
          info(`EMOTES: Fetched channel ${broadcasterId} emotes`);
          broadcasterWarning = false;
        } catch (e) {
          if (e instanceof Error) {
            if (e.message.includes('not found in auth provider')) {
              this.lastSubscriberEmoteChk = 0; // recheck next tick
              this.fetch.channel = false;
            } else {
              error (e.stack ?? e.message);
            }
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
      try {
        if (this.lastGlobalEmoteChk !== 0) {
          info('EMOTES: Fetching global emotes');
        }

        const emotes = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.chat.getGlobalEmotes());
        this.lastGlobalEmoteChk = Date.now();
        this.cache = this.cache.filter(o => o.type !== 'twitch');
        for (const emote of emotes ?? []) {
          await setImmediateAwait();
          debug('emotes.global', `Saving to cache ${emote.name}#${emote.id}`);
          this.cache.push({
            code: emote.name,
            type: 'twitch',
            urls: {
              '1': emote.getImageUrl(1),
              '2': emote.getImageUrl(2),
              '3': emote.getImageUrl(4),
            },
          });
        }
        info('EMOTES: Fetched global emotes');
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.includes('not found in auth provider')) {
            this.lastGlobalEmoteChk = 0; // recheck next tick
            this.fetch.global = false;
          } else {
            error (e.stack ?? e.message);
          }
        }
      }
    }

    this.fetch.global = false;
  }

  async fetchEmotesFFZ () {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    if (broadcasterUsername.length === 0) {
      return;
    }
    this.fetch.ffz = true;

    // fetch FFZ emotes
    if (broadcasterId && Date.now() - this.lastFFZEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      info('EMOTES: Fetching ffz emotes');
      this.lastFFZEmoteChk = Date.now();
      try {
        const request = await axios.get<any>('https://api.frankerfacez.com/v1/room/id/' + broadcasterId);

        const emoteSet = request.data.room.set;
        const emotes = request.data.sets[emoteSet].emoticons;

        for (let i = 0, length = emotes.length; i < length; i++) {
          // change 4x to 3x, to be same as Twitch and BTTV
          emotes[i].urls['3'] = emotes[i].urls['4']; delete emotes[i].urls['4'];
          const cachedEmote = this.cache.find(o => o.code === emotes[i].code && o.type === 'ffz');
          this.cache.push({
            ...cachedEmote,
            code: emotes[i].name,
            type: 'ffz',
            urls: emotes[i].urls,
          });
        }
        info('EMOTES: Fetched ffz emotes');
      } catch (e: any) {
        if (e.response.status === 404) {
          warning(`EMOTES: Channel ${broadcasterUsername} not found in ffz`);
        } else {
          error(e);
        }
      }

      this.fetch.ffz = false;
    }
  }

  async fetchEmotes7TV () {
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    if (broadcasterUsername.length === 0 || this['7tvEmoteSet'].trim().length === 0) {
      return;
    }

    const getAllChannelEmotes = async (query: string, urlTemplate: string, channel: string): Promise<void> => {
      const id = this['7tvEmoteSet'].split('/')[this['7tvEmoteSet'].split('/').length - 1];
      const request = await axios.post<any>('https://7tv.io/v3/gql', {
        operationName: 'GetEmoteSet',
        query,
        variables:     {
          id,
        },
      });

      if (request.data.data.emoteSet && request.data.data.emoteSet.emotes) {
        for (let i = 0, length = request.data.data.emoteSet.emotes.length; i < length; i++) {
          await setImmediateAwait();
          const cachedEmote = this.cache.find(o => o.code === request.data.data.emoteSet.emotes[i].name && o.type === '7tv');
          this.cache.push({
            ...cachedEmote,
            code: request.data.data.emoteSet.emotes[i].name,
            type: '7tv',
            urls: {
              '1': urlTemplate.replace('{{id}}', request.data.data.emoteSet.emotes[i].id).replace('{{image}}', '1x.avif'),
              '2': urlTemplate.replace('{{id}}', request.data.data.emoteSet.emotes[i].id).replace('{{image}}', '2x.avif'),
              '3': urlTemplate.replace('{{id}}', request.data.data.emoteSet.emotes[i].id).replace('{{image}}', '3x.avif'),
            },
          });
        }
      }
    };

    this.fetch['7tv'] = true;

    if (Date.now() - this.last7TVEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      info('EMOTES: Fetching 7tv emotes');
      this.last7TVEmoteChk = Date.now();
      this.cache = this.cache.filter(o => o.type !== '7tv');
      try {
        const urlTemplate = `https://cdn.7tv.app/emote/{{id}}/{{image}}`;

        const query2 = `query GetEmoteSet($id: ObjectID!, $formats: [ImageFormat!]) {  emoteSet(id: $id) {    id    name    capacity    emotes {      id      name      data {        id        name        flags        listed        host {          url          files(formats: $formats) {            name            format            __typename          }          __typename        }        owner {          id          display_name          style {            color            __typename          }          roles          __typename        }        __typename      }      __typename    }    owner {      id      username      display_name      style {        color        __typename      }      avatar_url      roles      connections {        emote_capacity        __typename      }      __typename    }    __typename  }}`;
        await getAllChannelEmotes(query2, urlTemplate, broadcasterUsername),
        info('EMOTES: Fetched 7tv emotes');
      } catch (e: any) {
        error(e);
      }
    }

    this.fetch['7tv'] = false;
  }
  async fetchEmotesGlobalBTTV () {
    this.fetch.globalBttv = true;

    // fetch BTTV emotes
    if (Date.now() - this.lastGlobalBTTVEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      info('EMOTES: Fetching global bttv emotes');
      this.lastGlobalBTTVEmoteChk = Date.now();
      this.cache = this.cache.filter(o => o.type !== 'bttv');
      try {
        const request = await axios.get<any>('https://api.betterttv.net/3/cached/emotes/global');

        const urlTemplate = 'https://cdn.betterttv.net/emote/{{id}}/{{image}}.webp';
        const emotes = request.data;

        for (let i = 0, length = emotes.length; i < length; i++) {
          const cachedEmote = this.cache.find(o => o.code === emotes[i].code && o.type === 'bttv');
          this.cache.push({
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
        info('EMOTES: Fetched global bttv emotes');
      } catch (e: any) {
        error(e);
      }
    }

    this.fetch.globalBttv = false;
  }

  async fetchEmotesBTTV () {
    const broadcasterId = getBroadcasterId();

    if (broadcasterId.length === 0) {
      return;
    }

    this.fetch.bttv = true;

    // fetch BTTV emotes
    if (Date.now() - this.lastBTTVEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      info('EMOTES: Fetching bttv emotes');
      this.lastBTTVEmoteChk = Date.now();
      this.cache = this.cache.filter(o => o.type !== 'bttv');
      try {
        const request = await axios.get<any>('https://api.betterttv.net/3/cached/users/twitch/' + broadcasterId);

        const urlTemplate = request.data.urlTemplate;
        const emotes = request.data;

        for (let i = 0, length = emotes.length; i < length; i++) {
          const cachedEmote = this.cache.find(o => o.code === emotes[i].code && o.type === 'bttv');
          this.cache.push({
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
          warning(`EMOTES: Channel ${broadcasterId} not found in bttv`);
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
    ioServer?.of('/services/twitch').emit('emote', {
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
    ioServer?.of('/services/twitch').emit('emote.firework', { emotes, id: uuid() });
  }

  async explode (data: string[]) {
    const emotes = await this.parseEmotes(data);
    ioServer?.of('/services/twitch').emit('emote.explode', { emotes, id: uuid() });
  }

  @parser({ priority: constants.LOW })
  async containsEmotes (opts: ParserOptions) {
    if (!opts.sender) {
      return true;
    }

    const parsed: string[] = [];
    const usedEmotes: { [code: string]: Emotes['cache'][number]} = {};

    if (opts.emotesOffsets) {
    // add emotes from twitch which are not maybe in cache (other partner emotes etc)
      for (const emoteId of opts.emotesOffsets.keys()) {
        // if emote is already in cache, continue
        const firstEmoteOffset = opts.emotesOffsets.get(emoteId)?.shift();
        if (!firstEmoteOffset) {
          continue;
        }
        const emoteCode = opts.message.slice(Number(firstEmoteOffset.split('-')[0]), Number(firstEmoteOffset.split('-')[1])+1);
        const idx = this.cache.findIndex(o => o.code === emoteCode);
        if (idx === -1) {
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
          this.cache.push(data);
        }
      }
    }

    for (const potentialEmoteCode of opts.message.trim().split(' ').filter(Boolean)) {
      if (parsed.includes(potentialEmoteCode)) {
        continue;
      } // this emote was already parsed
      parsed.push(potentialEmoteCode);
      const emoteFromCache = this.cache.find(o => o.code === potentialEmoteCode && this.types.includes(o.type));
      if (emoteFromCache) {
        for (let i = 0; i < opts.message.split(' ').filter(word => word === potentialEmoteCode).length; i++) {
          usedEmotes[potentialEmoteCode + `${i}`] = emoteFromCache;
        }
      }
    }

    const emotes = shuffle(Object.keys(usedEmotes));
    for (let i = 0; i < emotes.length; i++) {
      const id = uuid();
      ioServer?.of('/services/twitch').emit('emote', { id, url: usedEmotes[emotes[i]].urls });
    }
    return true;
  }

  async parseEmotes (emotes: string[]) {
    const emotesArray: {1: string, 2: string, 3:string }[] = [];

    for (let i = 0, length = emotes.length; i < length; i++) {
      try {
        const items = this.cache.filter(o => o.code === emotes[i]);
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
