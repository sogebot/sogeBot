'use strict'

// 3rdparty libraries
const _ = require('lodash')
const constants = require('../constants.js')
const cluster = require('cluster')
const snekfetch = require('snekfetch')
const Message = require('../message')
const config = require('../../config.json')

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

Alerts.prototype.replay = async function (self, socket, data) {
  const replay = [
    'type=video',
    'url=' + data,
    'position=' + await global.configuration.getValue('replayPosition'),
    'x-offset=' + await global.configuration.getValue('replayOffsetX'),
    'y-offset=' + await global.configuration.getValue('replayOffsetY'),
    'size=' + await global.configuration.getValue('replaySize'),
    'volume=' + await global.configuration.getValue('replayVolume'),
    'label=' + await global.configuration.getValue('replayLabel'),
    'filter=' + await global.configuration.getValue('replayFilter'),
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
    let settings = o.match(/([\w-]+)=([\w-://.%?=$_|@&]+|'[\S ]+')/g)
    _.each(settings, function (s) {
      let data = { key: s.split(/=(.+)/)[0], value: s.split(/=(.+)/)[1] }
      if (data.key === 'text') {
        data.value = data.value.replace(/\$sender/g, sender.username)
      }
      object[data.key] = data.value
    })
    send.push(object)
  })

  // remove clips without url or id
  send = _.filter(send, (o) => (o.type === 'clip' && (!_.isNil(o.id) || !_.isNil(o.url))) || o.type !== 'clip')

  for (let object of send) {
    if (object.type === 'clip') {
      // load clip from api
      let clip = null
      if (!_.isNil(object.id)) clip = await self.getClipById(object.id)
      else if (!_.isNil(object.url)) clip = await self.getClipById(object.url.split('/').pop())
      clip.cDuration = clip.duration; delete clip.duration
      if (!_.isNil(clip)) _.merge(object, clip)
    }
  }
  global.panel.io.emit('overlay.show', send)
}

Alerts.prototype.getClipById = async function (id) {
  const url = `https://api.twitch.tv/kraken/clips/${id}`

  var request
  try {
    request = await snekfetch.get(url)
      .set('Accept', 'application/vnd.twitchtv.v5+json')
      .set('Client-ID', config.settings.client_id)
      .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
    global.panel.io.emit('api.stats', { data: request.body, timestamp: _.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: request.status, remaining: this.remainingAPICalls })
    return request.body
  } catch (e) {
    global.log.error(`${url} - ${e.message}`)
    global.panel.io.emit('api.stats', { timestamp: _.now(), call: 'getClipById', api: 'kraken', endpoint: url, code: `${e.status} ${_.get(e, 'body.message', e.message)}`, remaining: this.remainingAPICalls })
    return null
  }
}

module.exports = new Alerts()
