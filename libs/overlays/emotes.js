'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

function Emotes () {
  global.parser.registerParser(this, 'emotes', this.containsEmotes, constants.VIEWERS)
}

Emotes.prototype.containsEmotes = function (self, id, sender, text) {
  _.each(sender.emotes, function (index, emote) {
    _.each(index, function () {
      global.panel.io.emit('emote', emote)
    })
  })
  global.updateQueue(id, true)
}

module.exports = new Emotes()
