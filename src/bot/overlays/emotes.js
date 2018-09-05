'use strict'

// 3rdparty libraries
const _ = require('lodash')
const constants = require('../constants')
const cluster = require('cluster')
const { EmoteFetcher } = require('twitch-emoticons')

// bot libraries
const config = require('@config')

function Emotes () {
  this.simpleEmotes = {
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

  global.configuration.register('OEmotesSize', 'overlay.emotes.settings.OEmotesSize', 'number', 0)
  global.configuration.register('OEmotesMax', 'overlay.emotes.settings.OEmotesMax', 'number', 5)
  global.configuration.register('OEmotesAnimation', 'overlay.emotes.settings.OEmotesAnimation', 'string', 'fadeup')
  global.configuration.register('OEmotesAnimationTime', 'overlay.emotes.settings.OEmotesAnimationTime', 'number', 4000)

  if (cluster.isMaster) {
    global.panel.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' })
    global.panel.socketListening(this, 'emote.testExplosion', this._testExplosion)
    global.panel.socketListening(this, 'emote.test', this._test)

    // major bottleneck on worker
    this.fetcher = new EmoteFetcher()
    this.fetcher.fetchTwitchEmotes().catch(function (reason) {})
    this.fetcher.fetchBTTVEmotes().catch(function (reason) {})
    this.fetcher.fetchFFZEmotes().catch(function (reason) {})
    this.fetcher.fetchFFZEmotes(config.settings.broadcaster_username).catch(function (reason) {})
    this.fetcher.fetchBTTVEmotes(config.settings.broadcaster_username).catch(function (reason) {})
    this.fetcher.fetchTwitchEmotes(config.settings.broadcaster_username).catch(function (reason) {})
  }
}

Emotes.prototype.parsers = function () {
  return [
    { this: this, name: 'emotes', fnc: this.containsEmotes, permission: constants.VIEWERS, priority: constants.LOW, fireAndForget: true }
  ]
}

Emotes.prototype._testExplosion = async function (self, socket) {
  self.explode(self, socket, ['Kappa', 'GivePLZ', 'PogChamp'])
}

Emotes.prototype._test = async function (self, socket) {
  let OEmotesSize = await global.configuration.getValue('OEmotesSize')
  socket.emit('emote', 'https://static-cdn.jtvnw.net/emoticons/v1/9/' + (OEmotesSize + 1) + '.0')
}

Emotes.prototype.explode = async function (self, socket, data) {
  const emotes = await self.parseEmotes(self, data)
  socket.emit('emote.explode', emotes)
}

Emotes.prototype.containsEmotes = async function (opts) {
  if (_.isNil(opts.sender) || _.isNil(opts.sender.emotes)) return true
  if (cluster.isWorker) return process.send({ type: 'call', ns: 'overlays.emotes', fnc: 'containsEmotes', args: [opts] })

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
    for (let emote of await this.fetcher._getRawBTTVEmotes(config.settings.broadcaster_username)) {
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
    for (let emote of await this.fetcher._getRawFFZEmotes(config.settings.broadcaster_username)) {
      if (parsed.includes(emote.name)) continue
      for (let i in _.range((opts.message.match(new RegExp(emote.name, 'g')) || []).length)) {
        if (i === OEmotesMax) break
        global.panel.io.emit('emote', this.fetcher.emotes.get(emote.name).toLink(OEmotesSize))
      }
    }
  } catch (e) {
    // we don't want to output error when BTTV emotes doesn't exist
  }

  return true
}

Emotes.prototype.parseEmotes = async function (self, emotes) {
  let OEmotesSize = await global.configuration.getValue('OEmotesSize')
  let emotesArray = []

  for (var i = 0; i < emotes.length; i++) {
    if (_.includes(Object.keys(self.simpleEmotes), emotes[i])) {
      emotesArray.push(self.simpleEmotes[emotes[i]] + (OEmotesSize + 1) + '.0')
    } else {
      try {
        emotesArray.push(self.fetcher.emotes.get(emotes[i]).toLink(OEmotesSize))
      } catch (e) {
        continue
      }
    }
  }
  return emotesArray
}

module.exports = new Emotes()
