'use strict'

// 3rdparty libraries
const _ = require('lodash')
const emoticons = require('twitch-emoticons')

// bot libraries
const constants = require('../constants')

// TODO:
// implement explosions on events

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

  emoticons.loadBTTVChannel(global.configuration.get().twitch.channel)

  global.parser.registerParser(this, 'emotes', this.containsEmotes, constants.VIEWERS)

  global.configuration.register('OEmotesSize', 'overlay.emotes.settings.OEmotesSize', 'number', 0)
  global.configuration.register('OEmotesMax', 'overlay.emotes.settings.OEmotesMax', 'number', 5)
  global.configuration.register('OEmotesAnimation', 'overlay.emotes.settings.OEmotesAnimation', 'string', 'fadeup')
  global.configuration.register('OEmotesAnimationTime', 'overlay.emotes.settings.OEmotesAnimationTime', 'number', 4000)
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

Emotes.prototype.containsEmotes = async function (self, id, sender, text) {
  global.updateQueue(id, true)

  let OEmotesMax = global.configuration.getValue('OEmotesMax')
  let OEmotesSize = global.configuration.getValue('OEmotesSize')

  let parsed = await emoticons.parseAll(text, 'text', 2, '', '', '[{name}$]')
  _.each(self.simpleEmotes, function (link, emote) {
    parsed = parsed.replace(emote, '[' + emote + '$]')
  })

  _.each(parsed.match(/\[(\S*)\$\]/g), function (emote) {
    emote = emote.replace('[', '').replace('$]', '')

    if (_.includes(Object.keys(self.simpleEmotes), emote)) {
      global.panel.io.emit('emote', self.simpleEmotes[emote] + (OEmotesSize + 1) + '.0')
    } else {
      try {
        emoticons.emote(emote).then(function (obj) {
          global.panel.io.emit('emote', obj.toLink(OEmotesSize))
        })
      } catch (e) {
        return true
      }
    }
  })
}

Emotes.prototype.parseEmotes = async function (self, emotes) {
  let OEmotesSize = global.configuration.getValue('OEmotesSize')
  let emotesArray = []

  for (var i = 0; i < emotes.length; i++) {
    if (_.includes(Object.keys(self.simpleEmotes), emotes[i])) {
      emotesArray.push(self.simpleEmotes[emotes[i]] + (OEmotesSize + 1) + '.0')
    } else {
      try {
        let parsed = await emoticons.emote(emotes[i])
        emotesArray.push(parsed.toLink(OEmotesSize))
      } catch (e) {
        continue
      }
    }
  }
  return emotesArray
}

module.exports = new Emotes()
