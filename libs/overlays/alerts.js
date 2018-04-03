'use strict'

// 3rdparty libraries
const _ = require('lodash')
const constants = require('../constants.js')
const cluster = require('cluster')
const Message = require('../message')

function Alerts () {
  global.configuration.register('replayPosition', 'core.no-response', 'string', 'right')
  global.configuration.register('replayOffsetX', 'core.no-response', 'number', '-50')
  global.configuration.register('replayOffsetY', 'core.no-response', 'number', '-300')
  global.configuration.register('replaySize', 'core.no-response', 'number', '600')
  global.configuration.register('replayVolume', 'core.no-response', 'number', '0')
  global.configuration.register('replayFilter', 'core.no-response', 'string', 'none')
  global.configuration.register('replayLabel', 'core.no-response-bool', 'bool', true)

  if (cluster.isMaster) {
    global.panel.addMenu({category: 'settings', name: 'overlays', id: 'overlays'})
    global.panel.socketListening(this, 'replay-video', this.replay)

    cluster.on('message', (worker, d) => {
      if (d.type !== 'alert') return
      this[d.fnc](this, d.sender, d.text)
    })
  }
}

Alerts.prototype.commands = function () {
  return [
    {this: this, command: '!alert', fnc: this.overlay, permission: constants.OWNER_ONLY}
  ]
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
  text = await new Message(text).parse()
  if (cluster.isWorker) {
    return process.send({ type: 'alert', fnc: 'overlay', sender: sender, text: text })
  }

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
