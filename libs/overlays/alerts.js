'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

function Alerts () {
  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.parser.register(this, '!alert', this.overlay, constants.OWNER_ONLY)
}

Alerts.prototype.overlay = function (self, sender, text) {
  let send = []
  let objectString = text.trim().split(' | ')
  _.each(objectString, function (o) {
    let object = {}
    let settings = o.split(' ')
    _.each(settings, function (s) {
      let data = { key: s.split('=')[0], value: s.split('=')[1] }
      object[data.key] = data.value
    })
    send.push(object)
  })
  global.panel.io.emit('overlay.show', send)
}

module.exports = new Alerts()
