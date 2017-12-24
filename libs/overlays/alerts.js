'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

function Alerts () {
  global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
  global.parser.register(this, '!alert', this.overlay, constants.OWNER_ONLY)

  global.configuration.register('replayPosition', 'core.no-response', 'string', 'right')
  global.configuration.register('replayOffsetX', 'core.no-response', 'number', '-50')
  global.configuration.register('replayOffsetY', 'core.no-response', 'number', '-300')
  global.configuration.register('replaySize', 'core.no-response', 'number', '600')
  global.configuration.register('replayVolume', 'core.no-response', 'number', '0')
  global.configuration.register('replayFilter', 'core.no-response', 'string', 'none')
  global.configuration.register('replayLabel', 'core.no-response-bool', 'bool', true)

  global.panel.socketListening(this, 'replay-video', this.replay)
}

Alerts.prototype.replay = function (self, socket, data) {
  const replay = [
    'type=video',
    'url=' + data,
    'position=' + global.configuration.getValue('replayPosition'),
    'x-offset=' + global.configuration.getValue('replayOffsetX'),
    'y-offset=' + global.configuration.getValue('replayOffsetY'),
    'size=' + global.configuration.getValue('replaySize'),
    'volume=' + global.configuration.getValue('replayVolume'),
    'label=' + global.configuration.getValue('replayLabel'),
    'filter=' + global.configuration.getValue('replayFilter'),
    'class=replay'
  ]
  self.overlay(self, null, replay.join(' '))
}

Alerts.prototype.overlay = async function (self, sender, text) {
  text = await global.parser.parseMessage(text)
  let send = []
  let objectString = text.trim().split(' | ')
  _.each(objectString, function (o) {
    let object = {}
    let settings = o.match(/(\S+)=([\w-://.%]+|'[\S ]+')/g)
    _.each(settings, function (s) {
      let data = { key: s.split('=')[0], value: s.split('=')[1] }

      if (data.key === 'text') {
        data.value = data.value.replace(/\$sender/g, sender.username)
      }

      object[data.key] = data.value
    })
    send.push(object)
  })
  global.panel.io.emit('overlay.show', send)
}

module.exports = new Alerts()
