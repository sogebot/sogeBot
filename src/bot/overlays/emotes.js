// @flow
'use strict'

// 3rdparty libraries
const _ = require('lodash')
const constants = require('../constants')
const cluster = require('cluster')
const axios = require('axios')
const XRegExp = require('xregexp')

const Overlay = require('./_interface')

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
  }

  fetch = {
    global: false,
    subscribers: false,
    ffz: false,
    bttv: false
  }

  constructor () {
    const settings = {
      _: {
        lastGlobalEmoteChk: 0,
        lastSubscriberEmoteChk: 0,
        lastChannelChk: '',
        lastFFZEmoteChk: 0,
        lastBTTVEmoteChk: 0
      },
      emotes: {
        size: 1,
        maxEmotesPerMessage: 5,
        animation: 'fadeup',
        animationTime: 1000
      },
      explosion: {
        numOfEmotes: 20
      },
      fireworks: {
        numOfEmotesPerExplosion: 10,
        numOfExplosions: 5
      },
      parsers: [
        { name: 'containsEmotes', priority: constants.LOW, fireAndForget: true }
      ]
    }

    const ui = {
      explosion: {
        numOfEmotes: {
          type: 'number-input',
          step: '1',
          min: '1'
        }
      },
      fireworks: {
        numOfEmotesPerExplosion: {
          type: 'number-input',
          step: '1',
          min: '1'
        },
        numOfExplosions: {
          type: 'number-input',
          step: '1',
          min: '1'
        }
      },
      test: {
        /* type test are only for overlays */
        explosion: {
          type: 'test',
          test: 'explosion',
          text: 'systems.emotes.settings.test.emoteExplosion',
          class: 'btn btn-secondary btn-block'
        },
        emote: {
          type: 'test',
          test: 'emote',
          text: 'systems.emotes.settings.test.emote',
          class: 'btn btn-secondary btn-block'
        },
        firework: {
          type: 'test',
          test: 'fireworks',
          text: 'systems.emotes.settings.test.emoteFirework',
          class: 'btn btn-secondary btn-block'
        }
      },
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/emotes',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/emotes (1920x1080)',
          target: '_blank'
        }
      },
      emotes: {
        cache: {
          type: 'removecache',
          explosion: false,
          text: 'systems.emotes.settings.removecache',
          class: 'btn btn-danger btn-block'
        },
        animation: {
          type: 'selector',
          values: ['fadeup', 'fadezoom', 'facebook']
        },
        size: {
          type: 'selector',
          values: ['1', '2', '3']
        },
        numOfEmotes: {
          type: 'number-input',
          step: '1',
          min: '1'
        }
      }
    }
    super({ settings, ui })
    if (cluster.isMaster) {
      global.db.engine.index({ table: this.collection.cache, index: 'code' })
      setTimeout(() => {
        if (!this.fetch.global) this.fetchEmotesGlobal()
        if (!this.fetch.subscribers) this.fetchEmotesSubsribers()
        if (!this.fetch.ffz) this.fetchEmotesFFZ()
        if (!this.fetch.bttv) this.fetchEmotesBTTV()
      }, 10000)
    }
  }

  sockets () {
    global.panel.io.of('/overlays/emotes').on('connection', (socket) => {
      socket.on('remove.cache', () => this.removeCache())
      socket.on('emote.test', (test) => {
        if (test === 'explosion') this._testExplosion()
        else if (test === 'fireworks') this._testFireworks()
        else this._test()
      })
    })
  }

  async removeCache () {
    this.settings._.lastGlobalEmoteChk = 0
    this.settings._.lastSubscriberEmoteChk = 0
    this.settings._.lastFFZEmoteChk = 0
    this.settings._.lastBTTVEmoteChk = 0
    await global.db.engine.remove(this.collection.cache, {})

    if (!this.fetch.global) this.fetchEmotesGlobal()
    if (!this.fetch.subscribers) this.fetchEmotesSubsribers()
    if (!this.fetch.ffz) this.fetchEmotesFFZ()
    if (!this.fetch.bttv) this.fetchEmotesBTTV()
  }

  async fetchEmotesGlobal () {
    this.fetch.global = true

    // we want to update once every week
    if (Date.now() - this.settings._.lastGlobalEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      global.log.info('EMOTES: Fetching global emotes')
      this.settings._.lastGlobalEmoteChk = Date.now()
      try {
        const request = await axios.get('https://twitchemotes.com/api_cache/v3/global.json')
        const codes = Object.keys(request.data)
        for (let i = 0, length = codes.length; i < length; i++) {
          await global.db.engine.update(this.collection.cache,
            {
              code: codes[i],
              type: 'twitch'
            },
            {
              urls: {
                '1': 'https://static-cdn.jtvnw.net/emoticons/v1/' + request.data[codes[i]].id + '/1.0',
                '2': 'https://static-cdn.jtvnw.net/emoticons/v1/' + request.data[codes[i]].id + '/2.0',
                '3': 'https://static-cdn.jtvnw.net/emoticons/v1/' + request.data[codes[i]].id + '/3.0'
              }
            })
        }
        global.log.info('EMOTES: Fetched global emotes')
      } catch (e) {
        global.log.error(e)
      }
    }

    this.fetch.global = false
  }

  async fetchEmotesSubsribers () {
    const cid = global.oauth.channelId
    this.fetch.subscribers = true

    if (cid && (Date.now() - this.settings._.lastSubscriberEmoteChk > 1000 * 60 * 60 * 24 * 7 || this.settings._.lastChannelChk !== cid)) {
      global.log.info('EMOTES: Fetching subscriber emotes')
      this.settings._.lastSubscriberEmoteChk = Date.now()
      this.settings._.lastChannelChk = cid
      try {
        const request = await axios.get('https://twitchemotes.com/api_cache/v3/subscriber.json')
        const emoteId = Object.keys(request.data)
        for (let i = 0, length = emoteId.length; i < length; i++) {
          if (request.data[emoteId[i]].channel_id === cid) {
            const emotes = request.data[emoteId[i]].emotes
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
                })
            }
          }
        }
        global.log.info('EMOTES: Fetched subscriber emotes')
      } catch (e) {
        global.log.error(e)
      }

      this.fetch.subscribers = false
    }
  }

  async fetchEmotesFFZ () {
    const cid = global.oauth.channelId
    this.fetch.ffz = true

    // fetch FFZ emotes
    if (cid && Date.now() - this.settings._.lastFFZEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      global.log.info('EMOTES: Fetching ffz emotes')
      this.settings._.lastFFZEmoteChk = Date.now()
      try {
        const request = await axios.get('https://api.frankerfacez.com/v1/room/id/' + cid)

        const emoteSet = request.data.room.set
        const emotes = request.data.sets[emoteSet].emoticons

        for (let i = 0, length = emotes.length; i < length; i++) {
          // change 4x to 3x, to be same as Twitch and BTTV
          emotes[i].urls['3'] = emotes[i].urls['4']; delete emotes[i].urls['4']
          await global.db.engine.update(this.collection.cache,
            {
              code: emotes[i].name,
              type: 'ffz'
            },
            {
              urls: emotes[i].urls
            })
        }
        global.log.info('EMOTES: Fetched ffz emotes')
      } catch (e) {
        global.log.error(e)
      }

      this.fetch.ffz = false
    }
  }

  async fetchEmotesBTTV () {
    const channel = global.oauth.currentChannel
    this.fetch.bttv = true

    // fetch BTTV emotes
    if (channel && Date.now() - this.settings._.lastBTTVEmoteChk > 1000 * 60 * 60 * 24 * 7) {
      global.log.info('EMOTES: Fetching bttv emotes')
      this.settings._.lastBTTVEmoteChk = Date.now()
      try {
        const request = await axios.get('https://api.betterttv.net/2/channels/' + channel)

        const urlTemplate = request.data.urlTemplate
        const emotes = request.data.emotes

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

            })
        }
        global.log.info('EMOTES: Fetched bttv emotes')
      } catch (e) {
        global.log.error(e)
      }
    }

    this.fetch.bttv = false
  }

  async _testFireworks () {
    this.firework(['Kappa', 'GivePLZ', 'PogChamp'])
  }

  async _testExplosion () {
    this.explode(['Kappa', 'GivePLZ', 'PogChamp'])
  }

  async _test () {
    global.panel.io.of('/overlays/emotes').emit('emote', {
      url: 'https://static-cdn.jtvnw.net/emoticons/v1/9/' + this.settings.emotes.size + '.0',
      settings: {
        emotes: {
          animation: this.settings.emotes.animation,
          animationTime: this.settings.emotes.animationTime
        }
      }
    })
  }

  async firework (data: Array<string>) {
    const emotes = await this.parseEmotes(data)
    global.panel.io.of('/overlays/emotes').emit('emote.firework', {
      emotes,
      settings: {
        emotes: {
          animationTime: this.settings.emotes.animationTime
        },
        fireworks: {
          numOfEmotesPerExplosion: this.settings.fireworks.numOfEmotesPerExplosion,
          numOfExplosions: this.settings.fireworks.numOfExplosions
        }
      }
    })
  }

  async explode (data: Array<string>) {
    const emotes = await this.parseEmotes(data)
    global.panel.io.of('/overlays/emotes').emit('emote.explode', {
      emotes,
      settings: {
        emotes: {
          animationTime: this.settings.emotes.animationTime
        },
        explosion: {
          numOfEmotes: this.settings.explosion.numOfEmotes
        }
      }
    })
  }

  async containsEmotes (opts: ParserOptions) {
    if (_.isNil(opts.sender)) return true
    if (cluster.isWorker) {
      if (process.send) process.send({ type: 'call', ns: 'overlays.emotes', fnc: 'containsEmotes', args: [opts] })
      return
    }

    let parsed = []
    let usedEmotes = {}

    let cache = await global.db.engine.find(this.collection.cache)

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
      })
    }

    for (let j = 0, jl = cache.length; j < jl; j++) {
      const emote = cache[j]
      if (parsed.includes(emote.code)) continue // this emote was already parsed
      for (let i = 0, length = (opts.message.match(new RegExp(XRegExp.escape(emote.code), 'g')) || []).length; i < length; i++) {
        usedEmotes[emote.code] = emote
        parsed.push(emote.code)
      }
    }

    const emotes = _.shuffle(parsed)
    for (let i = 0; i < this.settings.emotes.maxEmotesPerMessage && i < emotes.length; i++) {
      global.panel.io.of('/overlays/emotes').emit('emote', {
        url: usedEmotes[emotes[i]].urls[String(this.settings.emotes.size)],
        settings: {
          emotes: {
            animation: this.settings.emotes.animation,
            animationTime: this.settings.emotes.animationTime
          }
        }
      })
    }

    return true
  }

  async parseEmotes (emotes: Array<string>) {
    let emotesArray = []

    for (var i = 0, length = emotes.length; i < length; i++) {
      if (_.includes(Object.keys(this.simpleEmotes), emotes[i])) {
        emotesArray.push(this.simpleEmotes[emotes[i]] + this.settings.emotes.size + '.0')
      } else {
        try {
          const items = await global.db.engine.find(this.collection.cache, { code: emotes[i] })
          if (!_.isEmpty(items)) {
            emotesArray.push(items[0].urls[this.settings.emotes.size])
          }
        } catch (e) {
          continue
        }
      }
    }
    return emotesArray
  }
}

module.exports = new Emotes()
