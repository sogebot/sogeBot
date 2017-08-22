'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

function Alerts () {
  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.parser.register(this, '!alert', this.overlay, constants.OWNER_ONLY)

  global.panel.socketListening(this, 'replay-video', this.replay)
}

Alerts.prototype.replay = function (self, socket, data) {
  self.overlay(self, null, 'type=video url=' + data + ' position=right x-offset=-50 y-offset=-300 size=600 volume=0')
}

Alerts.prototype.overlay = function (self, sender, text) {
  let send = []
  let objectString = text.trim().split(' | ')
  _.each(objectString, function (o) {
    let object = {}
    let settings = o.match(/(\S+)=([\w-://.%]+|'[\S ]+')/g)
    _.each(settings, function (s) {
      let data = { key: s.split('=')[0], value: s.split('=')[1] }

      if (data.key === 'text') {
        data.value = data.value.replace('$sender', sender.username)
      }

      object[data.key] = data.value
    })
    send.push(object)
  })
  global.panel.io.emit('overlay.show', send)
}

module.exports = new Alerts()
