import * as _ from 'lodash';
import * as constants from '../constants';
import { isMainThread } from '../cluster';
import axios from 'axios';
import XRegExp from 'xregexp';

import Overlay from './_interface';
import { parser, settings, ui } from '../decorators';
import { error, info, warning } from '../helpers/log';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';

import { getManager, getRepository } from 'typeorm';
import { CacheEmotes, CacheEmotesInterface } from '../database/entity/cacheEmotes';
import { v4 as uuid} from 'uuid';
import oauth from '../oauth';
import { ioServer } from '../helpers/panel';


const simpleEmotes = {
  ':)': 'https://static-cdn.jtvnw.net/emoticons/v1/1/',
  ':(': 'https://static-cdn.jtvnw.net/emoticons/v1/2/',
  ':o': 'https://static-cdn.jtvnw.net/emoticons/v1/8/',
  ':z': 'https://static-cdn.jtvnw.net/emoticons/v1/5/',
  'B)': 'https://static-cdn.jtvnw.net/emoticons/v1/7/',
  ':\\': 'https://static-cdn.jtvnw.net/emoticons/v1/10/',
  ';)': 'https://static-cdn.jtvnw.net/emoticons/v1/11/',
  ';p': 'https://static-cdn.jtvnw.net/emoticons/v1/13/',
  ':p': 'https://static-cdn.jtvnw.net/emoticons/v1/12/',
  'R)': 'https://static-cdn.jtvnw.net/emoticons/v1/14/',
  'o_O': 'https://static-cdn.jtvnw.net/emoticons/v1/6/',
  ':D': 'https://static-cdn.jtvnw.net/emoticons/v1/3/',
  '>(': 'https://static-cdn.jtvnw.net/emoticons/v1/4/',
  '<3': 'https://static-cdn.jtvnw.net/emoticons/v1/9/',
};

class Emotes extends Overlay {
  fetch = {
    global: false,
    channel: false,
    ffz: false,
    bttv: false,
  };

  lastGlobalEmoteChk = 0;
  lastSubscriberEmoteChk = 0;
  lastChannelChk: string | null = null;
  lastFFZEmoteChk = 0;
  lastBTTVEmoteChk = 0;

  @settings('emotes')
  @ui({ type: 'selector', values: ['1', '2', '3'] })
  cEmotesSize: 1 | 2 | 3 = 1;
  @settings('emotes')
  cEmotesMaxEmotesPerMessage = 5;
  @settings('emotes')
  @ui({ type: 'selector', values: ['fadeup', 'fadezoom', 'facebook'] })
  cEmotesAnimation: 'fadeup' | 'fadezoom' | 'facebook' = 'fadeup';
  @settings('emotes')
  cEmotesAnimationTime = 1000;

  @settings('explosion')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cExplosionNumOfEmotes = 20;

  @settings('fireworks')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cExplosionNumOfEmotesPerExplosion = 10;
  @settings('fireworks')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cExplosionNumOfExplosions = 5;

  @ui({ type: 'btn-emit', class: 'btn btn-secondary btn-block mt-1 mb-1', emit: 'testExplosion' }, 'test')
  btnTestExplosion = null;
  @ui({ type: 'btn-emit', class: 'btn btn-secondary btn-block mt-1 mb-1', emit: 'test' }, 'test')
  btnTestEmote = null;
  @ui({ type: 'btn-emit', class: 'btn btn-secondary btn-block mt-1 mb-1', emit: 'testFireworks' }, 'test')
  btnTestFirework = null;
  @ui({ type: 'link', href: '/overlays/emotes', class: 'btn btn-primary btn-block', rawText: '/overlays/emotes (1920x1080)', target: '_blank' }, 'links')
  btnLink = null;
  @ui({ type: 'btn-emit', class: 'btn btn-danger btn-block mt-1 mb-1', emit: 'removeCache' }, 'emotes')
  btnRemoveCache = null;

  constructor () {
    super();
    if (isMainThread) {
      setTimeout(() => {
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
      }, 10000);
    }
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
    const cid = oauth.channelId;
    this.fetch.channel = true;

    if (cid && oauth.broadcasterType !== null && (Date.now() - this.lastSubscriberEmoteChk > 1000 * 60 * 60 * 24 * 7 || this.lastChannelChk !== cid)) {
      if (oauth.broadcasterType === '') {
        info(`EMOTES: Skipping fetching of ${cid} emotes - not subscriber/affiliate`);
      } else {
        info(`EMOTES: Fetching channel ${cid} emotes`);
        this.lastSubscriberEmoteChk = Date.now();
        this.lastChannelChk = cid;
        try {
          const request = await axios.get('https://api.twitchemotes.com/api/v4/channels/' + cid);
          const emotes = request.data.emotes;
          for (let j = 0, length2 = emotes.length; j < length2; j++) {
            const cachedEmote = (await getRepository(CacheEmotes).findOne({ code: emotes[j].code, type: 'twitch' }));
            await getRepository(CacheEmotes).save({
              ...cachedEmote,
              code: emotes[j].code,
              type: 'twitch',
              urls: {
                '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/1.0',
                '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/2.0',
                '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/3.0',
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

      this.fetch.channel = false;
    }
  }

  async fetchEmotesGlobal () {
    this.fetch.global = true;

    // we want to update once every week
    if (Date.now() - this.lastGlobalEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      info('EMOTES: Fetching global emotes');
      this.lastGlobalEmoteChk = Date.now();
      try {
        const request = await axios.get('https://api.twitchemotes.com/api/v4/channels/0');
        const emotes = request.data.emotes;
        for (let i = 0, length = emotes.length; i < length; i++) {
          if (emotes[i].id < 15) {
            continue;
          } // skip simple emotes
          const cachedEmote = (await getRepository(CacheEmotes).findOne({ code: emotes[i].code, type: 'twitch' }));
          await getRepository(CacheEmotes).save({
            ...cachedEmote,
            code: emotes[i].code,
            type: 'twitch',
            urls: {
              '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[i].id + '/1.0',
              '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[i].id + '/2.0',
              '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[i].id + '/3.0',
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
    const cid = oauth.channelId;
    const channel = oauth.currentChannel;
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
            code: emotes[i].code,
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
      url: 'https://static-cdn.jtvnw.net/emoticons/v1/9/' + this.cEmotesSize + '.0',
      settings: {
        emotes: {
          animation: this.cEmotesAnimation,
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
        emotes: {
          animationTime: this.cEmotesAnimationTime,
        },
        fireworks: {
          numOfEmotesPerExplosion: this.cExplosionNumOfEmotesPerExplosion,
          numOfExplosions: this.cExplosionNumOfExplosions,
        },
      },
    });
  }

  async explode (data: string[]) {
    const emotes = await this.parseEmotes(data);
    ioServer?.of('/overlays/emotes').emit('emote.explode', {
      emotes,
      settings: {
        emotes: {
          animationTime: this.cEmotesAnimationTime,
        },
        explosion: {
          numOfEmotes: this.cExplosionNumOfEmotes,
        },
      },
    });
  }

  @parser({ priority: constants.LOW, fireAndForget: true })
  async containsEmotes (opts: ParserOptions) {
    if (_.isNil(opts.sender) || !Array.isArray(opts.sender.emotes)) {
      return true;
    }

    const parsed: string[] = [];
    const usedEmotes: { [code: string]: Readonly<Required<CacheEmotesInterface>>} = {};

    const cache = await getRepository(CacheEmotes).find();

    // add simple emotes
    for (const code of Object.keys(simpleEmotes)) {
      cache.push({
        id: uuid(),
        type: 'twitch',
        code,
        urls: {
          '1': simpleEmotes[code as keyof typeof simpleEmotes] + '1.0',
          '2': simpleEmotes[code as keyof typeof simpleEmotes] + '2.0',
          '3': simpleEmotes[code as keyof typeof simpleEmotes] + '3.0',
        },
      });
    }

    // add emotes from twitch which are not maybe in cache (other partner emotes etc)
    for (const emote of opts.sender.emotes) {
      // don't include simple emoted (id 1-14)
      if (Number(emote.id) < 15) {
        continue;
      }
      // if emote is already in cache, continue
      if (cache.find((o) => o.code === opts.message.slice(emote.start, emote.end+1))) {
        continue;
      }
      const data: Required<CacheEmotesInterface> = {
        id: uuid(),
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
      for (let i = 0, length = (opts.message.match(new RegExp('\\b' + XRegExp.escape(emote.code) + '\\b', 'g')) || []).length; i < length; i++) {
        usedEmotes[emote.code] = emote;
        parsed.push(emote.code);
      }
    }

    const emotes = _.shuffle(parsed);
    for (let i = 0; i < this.cEmotesMaxEmotesPerMessage && i < emotes.length; i++) {
      ioServer?.of('/overlays/emotes').emit('emote', {
        url: usedEmotes[emotes[i]].urls[this.cEmotesSize],
        settings: {
          emotes: {
            animation: this.cEmotesAnimation,
            animationTime: this.cEmotesAnimationTime,
          },
        },
      });
    }

    return true;
  }

  async parseEmotes (emotes: string[]) {
    const emotesArray: string[] = [];

    for (let i = 0, length = emotes.length; i < length; i++) {
      if (_.includes(Object.keys(simpleEmotes), emotes[i])) {
        emotesArray.push((simpleEmotes[emotes[i] as keyof typeof simpleEmotes]) + this.cEmotesSize + '.0');
      } else {
        try {
          const items = await getRepository(CacheEmotes).find({ code: emotes[i] });
          if (!_.isEmpty(items)) {
            emotesArray.push(items[0].urls[this.cEmotesSize]);
          }
        } catch (e) {
          continue;
        }
      }
    }
    return emotesArray;
  }
}

export default new Emotes();