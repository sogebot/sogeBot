import * as _ from 'lodash';
import * as constants from '../constants';
import { isMainThread } from 'worker_threads';
import axios from 'axios';
import XRegExp from 'xregexp';

import Overlay from './_interface';
import { parser, settings, ui } from '../decorators';

interface cachedEmote { type: 'twitch' | 'bttv' | 'ffz'; code: string; urls: { '1': string; '2': string; '3': string }}

class Emotes extends Overlay {
  simpleEmotes = {
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
    '<3': 'https://static-cdn.jtvnw.net/emoticons/v1/9/'
  };

  fetch = {
    global: false,
    channel: false,
    ffz: false,
    bttv: false
  };

  lastGlobalEmoteChk: number = 0;
  lastSubscriberEmoteChk: number = 0;
  lastChannelChk: string | null = null;
  lastFFZEmoteChk: number = 0;
  lastBTTVEmoteChk: number = 0;

  @settings('emotes')
  @ui({ type: 'selector', values: ['1', '2', '3'] })
  cEmotesSize: number = 1;
  @settings('emotes')
  cEmotesMaxEmotesPerMessage: number = 5;
  @settings('emotes')
  @ui({ type: 'selector', values: ['fadeup', 'fadezoom', 'facebook'] })
  cEmotesAnimation: 'fadeup' | 'fadezoom' | 'facebook' = 'fadeup';
  @settings('emotes')
  cEmotesAnimationTime: number = 1000;

  @settings('explosion')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cExplosionNumOfEmotes: number = 20;

  @settings('fireworks')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cExplosionNumOfEmotesPerExplosion: number = 10;
  @settings('fireworks')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cExplosionNumOfExplosions: number = 5;

  @ui({ type: 'test', test: 'explosion', text: 'systems.emotes.settings.test.emoteExplosion', class: 'btn btn-secondary btn-block' }, 'test')
  btnTestExplosion: null = null;
  @ui({ type: 'test', test: 'emote', text: 'systems.emotes.settings.test.emote', class: 'btn btn-secondary btn-block' }, 'test')
  btnTestEmote: null = null;
  @ui({ type: 'test', test: 'fireworks', text: 'systems.emotes.settings.test.emoteFirework', class: 'btn btn-secondary btn-block' }, 'test')
  btnTestFirework: null = null;
  @ui({ type: 'link', href: '/overlays/emotes', class: 'btn btn-primary btn-block', rawText: '/overlays/emotes (1920x1080)', target: '_blank' }, 'links')
  btnLink: null = null;
  @ui({ type: 'removecache', explosion: false, text: 'systems.emotes.settings.removecache', class: 'btn btn-danger btn-block' }, 'emotes')
  btnRemoveCache: null = null;

  constructor () {
    super();
    if (isMainThread) {
      global.db.engine.index(this.collection.cache, { index: 'code' });
      setTimeout(() => {
        if (!this.fetch.global) {this.fetchEmotesGlobal();}
        if (!this.fetch.channel) {this.fetchEmotesChannel();}
        if (!this.fetch.ffz) {this.fetchEmotesFFZ();}
        if (!this.fetch.bttv) {this.fetchEmotesBTTV();}
      }, 10000);
    }
  }

  sockets () {
    global.panel.io.of('/overlays/emotes').on('connection', (socket) => {
      socket.on('remove.cache', () => this.removeCache());
      socket.on('emote.test', (test) => {
        if (test === 'explosion') {this._testExplosion();}
        else if (test === 'fireworks') {this._testFireworks();}
        else {this._test();}
      });
    });
  }

  async removeCache () {
    this.lastGlobalEmoteChk = 0;
    this.lastSubscriberEmoteChk = 0;
    this.lastFFZEmoteChk = 0;
    this.lastBTTVEmoteChk = 0;
    await global.db.engine.remove(this.collection.cache, {});

    if (!this.fetch.global) {this.fetchEmotesGlobal();}
    if (!this.fetch.channel) {this.fetchEmotesChannel();}
    if (!this.fetch.ffz) {this.fetchEmotesFFZ();}
    if (!this.fetch.bttv) {this.fetchEmotesBTTV();}
  }

  async fetchEmotesChannel () {
    const cid = global.oauth.channelId;
    this.fetch.channel = true;

    if (cid && global.oauth.broadcasterType !== null && (Date.now() - this.lastSubscriberEmoteChk > 1000 * 60 * 60 * 24 * 7 || this.lastChannelChk !== cid)) {
      if (global.oauth.broadcasterType === '') {
        global.log.info(`EMOTES: Skipping fetching of ${cid} emotes - not subscriber/affiliate`);
      } else {
        global.log.info(`EMOTES: Fetching channel ${cid} emotes`);
        this.lastSubscriberEmoteChk = Date.now();
        this.lastChannelChk = cid;
        try {
          const request = await axios.get('https://api.twitchemotes.com/api/v4/channels/' + cid);
          const emotes = request.data.emotes;
          for (let j = 0, length2 = emotes.length; j < length2; j++) {
            await global.db.engine.update(this.collection.cache,
              {
                code: emotes[j].code,
                type: 'twitch'
              },
              {
                urls: {
                  '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/1.0',
                  '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/2.0',
                  '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/3.0'
                }
              });
          }
          global.log.info(`EMOTES: Fetched channel ${cid} emotes`);
        } catch (e) {
          if (String(e).includes('404')) {
            global.log.error(`EMOTES: Error fetching channel ${cid} emotes. Your channel was not found on twitchemotes.com. Add your channel at https://twitchemotes.com/contact/tip`);
          } else {
            global.log.error(e);
            global.log.error(e.stack);
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
      global.log.info('EMOTES: Fetching global emotes');
      this.lastGlobalEmoteChk = Date.now();
      try {
        const request = await axios.get('https://api.twitchemotes.com/api/v4/channels/0');
        const emotes = request.data.emotes;
        for (let i = 0, length = emotes.length; i < length; i++) {
          if (emotes[i].id < 15) {continue;} // skip simple emotes
          await global.db.engine.update(this.collection.cache,
            {
              code: emotes[i].code,
              type: 'twitch'
            },
            {
              urls: {
                '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[i].id + '/1.0',
                '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[i].id + '/2.0',
                '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[i].id + '/3.0'
              }
            });
        }
        global.log.info('EMOTES: Fetched global emotes');
      } catch (e) {
        global.log.error(e);
        global.log.error(e.stack);
      }
    }

    this.fetch.global = false;
  }

  async fetchEmotesSubsribers () {
    const cid = global.oauth.channelId;
    this.fetch.channel = true;

    if (cid && global.oauth.broadcasterType !== null && (Date.now() - this.lastSubscriberEmoteChk > 1000 * 60 * 60 * 24 * 7 || this.lastChannelChk !== cid)) {
      if (global.oauth.broadcasterType === '') {
        global.log.info(`EMOTES: Skipping fetching of ${cid} emotes - not subscriber/affiliate`);
      } else {
        global.log.info(`EMOTES: Fetching channel ${cid} emotes`);
        this.lastSubscriberEmoteChk = Date.now();
        this.lastChannelChk = cid;
        try {
          const request = await axios.get('https://api.twitchemotes.com/api/v4/channels/' + cid);
          const emotes = request.data.emotes;
          for (let j = 0, length2 = emotes.length; j < length2; j++) {
            await global.db.engine.update(this.collection.cache,
              {
                code: emotes[j].code,
                type: 'twitch'
              },
              {
                urls: {
                  '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/1.0',
                  '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/2.0',
                  '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/3.0'
                }
              });
          }
          global.log.info(`EMOTES: Fetched channel ${cid} emotes`);
        } catch (e) {
          if (String(e).includes('404')) {
            global.log.error(`EMOTES: Error fetching channel ${cid} emotes. Your channel was not found on twitchemotes.com. Add your channel at https://twitchemotes.com/contact/tip`);
          } else {
            global.log.error(e);
            global.log.error(e.stack);
          }
        }
      }

      this.fetch.channel = false;
    }
  }

  async fetchEmotesFFZ () {
    const cid = global.oauth.channelId;
    this.fetch.ffz = true;

    // fetch FFZ emotes
    if (cid && Date.now() - this.lastFFZEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      global.log.info('EMOTES: Fetching ffz emotes');
      this.lastFFZEmoteChk = Date.now();
      try {
        const request = await axios.get('https://api.frankerfacez.com/v1/room/id/' + cid);

        const emoteSet = request.data.room.set;
        const emotes = request.data.sets[emoteSet].emoticons;

        for (let i = 0, length = emotes.length; i < length; i++) {
          // change 4x to 3x, to be same as Twitch and BTTV
          emotes[i].urls['3'] = emotes[i].urls['4']; delete emotes[i].urls['4'];
          await global.db.engine.update(this.collection.cache,
            {
              code: emotes[i].name,
              type: 'ffz'
            },
            {
              urls: emotes[i].urls
            });
        }
        global.log.info('EMOTES: Fetched ffz emotes');
      } catch (e) {
        global.log.error(e);
      }

      this.fetch.ffz = false;
    }
  }

  async fetchEmotesBTTV () {
    const channel = global.oauth.currentChannel;
    this.fetch.bttv = true;

    // fetch BTTV emotes
    if (channel && Date.now() - this.lastBTTVEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      global.log.info('EMOTES: Fetching bttv emotes');
      this.lastBTTVEmoteChk = Date.now();
      try {
        const request = await axios.get('https://api.betterttv.net/2/channels/' + channel);

        const urlTemplate = request.data.urlTemplate;
        const emotes = request.data.emotes;

        for (let i = 0, length = emotes.length; i < length; i++) {
          await global.db.engine.update(this.collection.cache,
            {
              code: emotes[i].code,
              type: 'bttv'
            },
            {
              urls: {
                '1': urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '1x'),
                '2': urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '2x'),
                '3': urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '3x')
              }

            });
        }
        global.log.info('EMOTES: Fetched bttv emotes');
      } catch (e) {
        global.log.error(e);
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
    global.panel.io.of('/overlays/emotes').emit('emote', {
      url: 'https://static-cdn.jtvnw.net/emoticons/v1/9/' + this.cEmotesSize + '.0',
      settings: {
        emotes: {
          animation: this.cEmotesAnimation,
          animationTime: this.cEmotesAnimationTime
        }
      }
    });
  }

  async firework (data: string[]) {
    const emotes = await this.parseEmotes(data);
    global.panel.io.of('/overlays/emotes').emit('emote.firework', {
      emotes,
      settings: {
        emotes: {
          animationTime: this.cEmotesAnimationTime
        },
        fireworks: {
          numOfEmotesPerExplosion: this.cExplosionNumOfEmotesPerExplosion,
          numOfExplosions: this.cExplosionNumOfExplosions
        }
      }
    });
  }

  async explode (data: string[]) {
    const emotes = await this.parseEmotes(data);
    global.panel.io.of('/overlays/emotes').emit('emote.explode', {
      emotes,
      settings: {
        emotes: {
          animationTime: this.cEmotesAnimationTime
        },
        explosion: {
          numOfEmotes: this.cExplosionNumOfEmotes
        }
      }
    });
  }

  @parser({ priority: constants.LOW, fireAndForget: true })
  async containsEmotes (opts: ParserOptions) {
    if (_.isNil(opts.sender) || !opts.sender.emotes) {return true;}
    if (!isMainThread) {
      global.workers.sendToMaster({ type: 'call', ns: 'overlays.emotes', fnc: 'containsEmotes', args: [opts] });
      return;
    }

    let parsed: string[] = [];
    let usedEmotes = {};

    let cache: cachedEmote[] = await global.db.engine.find(this.collection.cache);

    // add simple emotes
    for (const code of Object.keys(this.simpleEmotes)) {
      cache.push({
        type: 'twitch',
        code,
        urls: {
          '1': this.simpleEmotes[code] + '1.0',
          '2': this.simpleEmotes[code] + '2.0',
          '3': this.simpleEmotes[code] + '3.0'
        }
      });
    }

    // add emotes from twitch which are not maybe in cache (other partner emotes etc)
    for (const emote of opts.sender.emotes) {
      // don't include simple emoted (id 1-14)
      if (emote.id < 15) {continue;}
      // if emote is already in cache, continue
      if (cache.find((o) => o.code === opts.message.slice(emote.start, emote.end+1))) {continue;}
      const data: cachedEmote = {
        type: 'twitch',
        code: opts.message.slice(emote.start, emote.end+1),
        urls: {
          '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote.id + '/1.0',
          '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote.id + '/2.0',
          '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote.id + '/3.0',
        }
      };

      cache.push(data);

      // update emotes in cache
      global.db.engine.update(this.collection.cache,
        {
          code: data.code,
          type: 'twitch'
        },
        {
          urls: data.urls
        });
    }

    for (let j = 0, jl = cache.length; j < jl; j++) {
      const emote = cache[j];
      if (parsed.includes(emote.code)) {continue;} // this emote was already parsed
      for (let i = 0, length = (opts.message.match(new RegExp('\\b' + XRegExp.escape(emote.code) + '\\b', 'g')) || []).length; i < length; i++) {
        usedEmotes[emote.code] = emote;
        parsed.push(emote.code);
      }
    }

    const emotes = _.shuffle(parsed);
    for (let i = 0; i < this.cEmotesMaxEmotesPerMessage && i < emotes.length; i++) {
      global.panel.io.of('/overlays/emotes').emit('emote', {
        url: usedEmotes[emotes[i]].urls[String(this.cEmotesSize)],
        settings: {
          emotes: {
            animation: this.cEmotesAnimation,
            animationTime: this.cEmotesAnimationTime
          }
        }
      });
    }

    return true;
  }

  async parseEmotes (emotes: string[]) {
    let emotesArray: string[] = [];

    for (var i = 0, length = emotes.length; i < length; i++) {
      if (_.includes(Object.keys(this.simpleEmotes), emotes[i])) {
        emotesArray.push(this.simpleEmotes[emotes[i]] + this.cEmotesSize + '.0');
      } else {
        try {
          const items = await global.db.engine.find(this.collection.cache, { code: emotes[i] });
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

export default Emotes;
export { Emotes };