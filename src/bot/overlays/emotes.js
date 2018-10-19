'use strict'

// 3rdparty libraries
const _ = require('lodash')
const constants = require('../constants')
const cluster = require('cluster')
const axios = require('axios')
const XRegExp = require('xregexp')

const Overlay = require('./_interface')

class Emotes extends Overlay {
  connSckList = new Map()
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
      parsers: [
        { name: 'containsEmotes', priority: constants.LOW, fireAndForget: true }
      ]
    }

    const ui = {
      test: {
        /* explosion type test are only for overlays */
        explosion: {
          type: 'test',
          explosion: true,
          text: 'test.emoteExplosion',
          class: 'btn btn-secondary btn-block'
        },
        emote: {
          type: 'test',
          explosion: false,
          text: 'test.emote',
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
          text: 'remove.cache',
          class: 'btn btn-danger btn-block'
        },
        animation: {
          title: 'animation.select',
          type: 'selector',
          values: ['fadeup', 'fadezoom', 'facebook']
        },
        size: {
          title: 'animation.size',
          type: 'selector',
          values: ['1', '2', '3']
        }
      }
    }
    super({ settings, ui })
    if (cluster.isMaster) {
      this.sockets()
      global.db.engine.index({ table: this.collection.cache, index: 'code' })
      setInterval(() => this.fetchEmotes(), 10000)
    }
  }

  sockets () {
    global.panel.io.of('/overlays/emotes').on('connection', (socket) => {
      // somehow socket connection is sent twice
      if (!this.connSckList.has(socket.id)) {
        this.connSckList.set(socket.id, socket.id)
        socket.on('remove.cache', () => this.removeCache())
        socket.on('emote.test', (explosion) => {
          explosion ? this._testExplosion() : this._test()
        })
        socket.on('disconnect', () => {
          this.connSckList.delete(socket.id)
        })
      }
    })
  }

  async removeCache () {
    this.settings._.lastGlobalEmoteChk = 0
    this.settings._.lastSubscriberEmoteChk = 0
    this.settings._.lastFFZEmoteChk = 0
    this.settings._.lastBTTVEmoteChk = 0
    await global.db.engine.remove(this.collection.cache, {})
    this.fetchEmotes()
  }

  async fetchEmotes () {
    const cid = global.oauth.channelId
    const channel = global.oauth.currentChannel
    if (!cid) return

    // we want to update once every week
    if (Date.now() - this.settings._.lastGlobalEmoteChk > 1000 * 60 * 60 * 24 * 7) {
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
                1: 'https://static-cdn.jtvnw.net/emoticons/v1/' + request.data[codes[i]].id + '/1.0',
                2: 'https://static-cdn.jtvnw.net/emoticons/v1/' + request.data[codes[i]].id + '/2.0',
                3: 'https://static-cdn.jtvnw.net/emoticons/v1/' + request.data[codes[i]].id + '/3.0'
              }
            })
        }
      } catch (e) {
        global.log.error(e)
      }
    }

    if (Date.now() - this.settings._.lastSubscriberEmoteChk > 1000 * 60 * 60 * 24 * 7 || this.settings._.lastChannelChk !== cid) {
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
                    1: 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/1.0',
                    2: 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/2.0',
                    3: 'https://static-cdn.jtvnw.net/emoticons/v1/' + emotes[j].id + '/3.0'
                  }
                })
            }
          }
        }
      } catch (e) {
        global.log.error(e)
      }
    }

    // fetch FFZ emotes
    if (Date.now() - this.settings._.lastFFZEmoteChk > 1000 * 60 * 60 * 24 * 7) {
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
      } catch (e) {
        global.log.error(e)
      }
    }

    // fetch BTTV emotes
    if (Date.now() - this.settings._.lastBTTVEmoteChk > 1000 * 60 * 60 * 24 * 7) {
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
                1: urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '1x'),
                2: urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '2x'),
                3: urlTemplate.replace('{{id}}', emotes[i].id).replace('{{image}}', '3x')
              }

            })
        }
      } catch (e) {
        global.log.error(e)
      }
    }
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

  async explode (data) {
    const emotes = await this.parseEmotes(data)
    global.panel.io.of('/overlays/emotes').emit('emote.explode', {
      emotes,
      settings: {
        emotes: {
          animationTime: this.settings.emotes.animationTime
        }
      }
    })
  }

  async containsEmotes (opts) {
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
          1: this.simpleEmotes[code] + '1.0',
          2: this.simpleEmotes[code] + '2.0',
          3: this.simpleEmotes[code] + '3.0'
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
      global.panel.io.emit('emote', {
        url: usedEmotes[emotes[i]].urls[this.settings.emotes.size],
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

  async parseEmotes (emotes) {
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
