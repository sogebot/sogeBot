'use strict'

var _ = require('lodash')
var glob = require('glob')

function SoundboardWidget () {
  global.panel.addWidget('soundboard', 'SoundBoard', 'music')

  global.panel.socketListening(this, 'getSoundBoardSounds', this.getSoundBoardSounds)
}

SoundboardWidget.prototype.getSoundBoardSounds = function (self, socket) {
  glob('public/dist/soundboard/*.mp3', function (err, files) {
    if (err) return

    var sounds = []
    _.each(files, function (file) {
      sounds.push(file.split('/').pop().replace('.mp3', ''))
    })
    socket.emit('soundBoardSounds', sounds)
  })
}

module.exports = new SoundboardWidget()
