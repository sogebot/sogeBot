'use strict'

// 3rdparty libraries
const _ = require('lodash')
const constants = require('../constants')
const cluster = require('cluster')
const { EmoteFetcher } = require('twitch-emoticons')

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
      emotes: {
        size: 0,
        maxEmotesPerMessage: 5,
        animation: 'fadeup',
        animationTime: 4000
      },
      parsers: [
        { name: 'containsEmotes', priority: constants.LOW, fireAndForget: true },
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
        animation: {
          title: 'animation.select',
          type: 'selector',
          values: ['fadeup', 'fadezoom', 'facebook']
        }
      }
    }
    super({ settings, ui })
    if (cluster.isMaster) this.sockets()

    // major bottleneck on worker
    this.fetchEmotes()
  }

  sockets () {
    global.panel.io.of('/overlays/emotes').on('connection', (socket) => {
      // somehow socket connection is sent twice
      if (!this.connSckList.has(socket.id)) {
        this.connSckList.set(socket.id, socket.id)
        socket.on('emote.test', (explosion) => {
          explosion ? this._testExplosion() : this._test()
        })
        socket.on('disconnect', () => {
          this.connSckList.delete(socket.id)
        })
      }
    })
  }

  async fetchEmotes () {
    this.fetcher = new EmoteFetcher()
    /*this.fetcher.fetchTwitchEmotes().catch(function (reason) {})
    this.fetcher.fetchBTTVEmotes().catch(function (reason) {})
    this.fetcher.fetchFFZEmotes().catch(function (reason) {})
    this.fetcher.fetchFFZEmotes(await global.oauth.settings.broadcaster.username).catch(function (reason) {})
    this.fetcher.fetchBTTVEmotes(await global.oauth.settings.broadcaster.username).catch(function (reason) {})
    this.fetcher.fetchTwitchEmotes(await global.oauth.settings.broadcaster.username).catch(function (reason) {})*/
  }

  async _testExplosion () {
    this.explode(['Kappa', 'GivePLZ', 'PogChamp'])
  }

  async _test () {
    global.panel.io.of('/overlays/emotes').emit('emote', 'https://static-cdn.jtvnw.net/emoticons/v1/9/' + (this.settings.emotes.size + 1) + '.0')
  }

  async explode (data) {
    const emotes = await this.parseEmotes(data)
    global.panel.io.of('/overlays/emotes').emit('emote.explode', emotes)
  }

  async containsEmotes (opts) {
    /*
    if (_.isNil(opts.sender) || _.isNil(opts.sender.emotes) || !(Symbol.iterator in Object(opts.sender.emotes))) return true
    if (cluster.isWorker) {
      if (process.send) process.send({ type: 'call', ns: 'overlays.emotes', fnc: 'containsEmotes', args: [opts] })
      return
    }

    let OEmotesMax = await global.configuration.getValue('OEmotesMax')
    let OEmotesSize = await global.configuration.getValue('OEmotesSize')

    let limit = 0
    for (let e of opts.sender.emotes) {
      if (limit === OEmotesMax) return false
      global.panel.io.emit('emote', 'https://static-cdn.jtvnw.net/emoticons/v1/' + e.id + '/' + (OEmotesSize + 1) + '.0')
      limit++
    }

    let parsed = []
    // parse BTTV emoticons
    try {
      for (let emote of await this.fetcher._getRawBTTVEmotes(await global.oauth.settings.broadcaster.username)) {
        for (let i in _.range((opts.message.match(new RegExp(emote.code, 'g')) || []).length)) {
          if (i === OEmotesMax) break
          global.panel.io.emit('emote', this.fetcher.emotes.get(emote.code).toLink(OEmotesSize))
          parsed.push(emote.code)
        }
      }
    } catch (e) {
      // we don't want to output error when BTTV emotes doesn't exist
    }

    // parse FFZ emoticons
    try {
      for (let emote of await this.fetcher._getRawFFZEmotes(await global.oauth.settings.broadcaster.username)) {
        if (parsed.includes(emote.name)) continue
        for (let i in _.range((opts.message.match(new RegExp(emote.name, 'g')) || []).length)) {
          if (i === OEmotesMax) break
          global.panel.io.emit('emote', this.fetcher.emotes.get(emote.name).toLink(OEmotesSize))
        }
      }
    } catch (e) {
      // we don't want to output error when BTTV emotes doesn't exist
    }
*/
    return true
  }

  async parseEmotes (emotes) {
    let emotesArray = []

    for (var i = 0; i < emotes.length; i++) {
      if (_.includes(Object.keys(this.simpleEmotes), emotes[i])) {
        emotesArray.push(this.simpleEmotes[emotes[i]] + (this.settings.emotes.size + 1) + '.0')
      } else {
        try {
          emotesArray.push(this.fetcher.emotes.get(emotes[i]).toLink(this.settings.emotes.size))
        } catch (e) {
          continue
        }
      }
    }
    return emotesArray
  }
}

module.exports = new Emotes()
