'use strict'

// 3rdparty libraries
const _ = require('lodash')
const emoticons = require('twitch-emoticons')

// bot libraries
const constants = require('../constants')

// TODO:
// implement explosions on events

function Emotes () {
  emoticons.loadBTTVChannel(global.configuration.get().twitch.channel)

  global.parser.registerParser(this, 'emotes', this.containsEmotes, constants.VIEWERS)

  global.configuration.register('OEmotesSize', 'overlay.emotes.settings.OEmotesSize', 'number', 2)
  global.configuration.register('OEmotesMax', 'overlay.emotes.settings.OEmotesMax', 'number', 5)
  global.configuration.register('OEmotesAnimation', 'overlay.emotes.settings.OEmotesAnimation', 'string', 'fadeup')
  global.configuration.register('OEmotesFollowerExplosion', 'overlay.emotes.settings.OEmotesFollowerExplosion', 'bool', false)
  global.configuration.register('OEmotesFollowerExplosionList', 'overlay.emotes.settings.OEmotesFollowerExplosionList', 'string', '<3')
  global.configuration.register('OEmotesSubscribeExplosion', 'overlay.emotes.settings.OEmotesSubscribeExplosion', 'bool', false)
  global.configuration.register('OEmotesSubscribeExplosionList', 'overlay.emotes.settings.OEmotesSubscribeExplosionList', 'string', ':)')
  global.configuration.register('OEmotesResubExplosion', 'overlay.emotes.settings.OEmotesResubExplosion', 'bool', false)
  global.configuration.register('OEmotesResubExplosionList', 'overlay.emotes.settings.OEmotesResubExplosionList', 'string', ':)')

  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.panel.socketListening(this, 'emote.test', this._test)
}

Emotes.prototype._test = async function (self, socket, data) {
  const emotes = await self.parseEmotes(self, data)
  socket.emit('emote.explode', emotes)
}

Emotes.prototype.containsEmotes = function (self, id, sender, text) {
  let OEmotesMax = global.configuration.getValue('OEmotesMax')

  _.each(sender.emotes, function (index, emote) {
    _.each(index, function (v, i) {
      if (i === OEmotesMax) return false
      global.panel.io.emit('emote', emote)
    })
  })
  global.updateQueue(id, true)
}

Emotes.prototype.parseEmotes = async function (self, emotes) {
  let OEmotesSize = global.configuration.getValue('OEmotesSize')
  let emotesArray = []

  for (var i = 0; i < emotes.length; i++) {
    try {
      let parsed = await emoticons.emote(emotes[i])
      emotesArray.push(parsed.toLink(OEmotesSize))
    } catch (e) {
      continue
    }
  }
  return emotesArray
}

module.exports = new Emotes()
