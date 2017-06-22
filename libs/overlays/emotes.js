'use strict'

// 3rdparty libraries
const _ = require('lodash')
const { EmoteFetcher } = require('twitch-emoticons')

// bot libraries
const constants = require('../constants')

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

  this.fetcher = new EmoteFetcher()
  this.fetcher.fetchTwitchEmotes()
  this.fetcher.fetchBTTVEmotes()
  this.fetcher.fetchBTTVEmotes(global.configuration.get().twitch.channel).catch(function (reason) {})
  this.fetcher.fetchTwitchEmotes(global.configuration.get().twitch.channel)

  global.parser.registerParser(this, 'emotes', this.containsEmotes, constants.VIEWERS)

  global.configuration.register('OEmotesSize', 'overlay.emotes.settings.OEmotesSize', 'number', 0)
  global.configuration.register('OEmotesMax', 'overlay.emotes.settings.OEmotesMax', 'number', 5)
  global.configuration.register('OEmotesAnimation', 'overlay.emotes.settings.OEmotesAnimation', 'string', 'fadeup')
  global.configuration.register('OEmotesAnimationTime', 'overlay.emotes.settings.OEmotesAnimationTime', 'number', 4000)

  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'emote.testExplosion', this._testExplosion)
  global.panel.socketListening(this, 'emote.test', this._test)
}

Emotes.prototype._testExplosion = async function (self, socket) {
  self.explode(self, socket, ['Kappa', 'GivePLZ', 'PogChamp'])
}

Emotes.prototype._test = async function (self, socket) {
  let OEmotesSize = global.configuration.getValue('OEmotesSize')
  socket.emit('emote', 'https://static-cdn.jtvnw.net/emoticons/v1/9/' + (OEmotesSize + 1) + '.0')
}

Emotes.prototype.explode = async function (self, socket, data) {
  const emotes = await self.parseEmotes(self, data)
  socket.emit('emote.explode', emotes)
}

Emotes.prototype.containsEmotes = async function (self, id, sender, text) {
  global.updateQueue(id, true)

  let OEmotesMax = global.configuration.getValue('OEmotesMax')
  let OEmotesSize = global.configuration.getValue('OEmotesSize')

  _.each(sender.emotes, function (v, emote) {
    let limit = 0
    _.each(v, function () {
      if (limit === OEmotesMax) return false
      global.panel.io.emit('emote', 'https://static-cdn.jtvnw.net/emoticons/v1/' + emote + '/' + (OEmotesSize + 1) + '.0')
      limit++
    })
  })

  // parse BTTV emoticons
  try {
    for (let emote of await self.fetcher._getRawBTTVEmotes(global.configuration.get().twitch.channel)) {
      for (let i in _.range((text.match(new RegExp(emote.code, 'g')) || []).length)) {
        if (i === OEmotesMax) break
        global.panel.io.emit('emote', self.fetcher.emotes.get(emote.code).toLink(OEmotesSize))
      }
    }
  } catch (e) {
    // we don't want to output error when BTTV emotes doesn't exist
    return true
  }
}

Emotes.prototype.parseEmotes = async function (self, emotes) {
  let OEmotesSize = global.configuration.getValue('OEmotesSize')
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
