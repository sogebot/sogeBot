// @flow

'use strict'

// 3rdparty libraries
const _ = require('lodash')
const constants = require('../constants.js')
const cluster = require('cluster')
const Message = require('../message')

const Overlay = require('./_interface')

class Alerts extends Overlay {
  constructor () {
    const settings = {
      commands: [
        { name: '!alert', fnc: 'overlay', permission: constants.OWNER_ONLY }
      ]
    }
    // define special property name as readonly
    const ui = {
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/alerts',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/alerts',
          target: '_blank'
        }
      }
    }

    super({ settings, ui })
    this.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' })
  }

  async overlay (opts: CommandOptions) {
    if (cluster.isWorker) {
      if (process.send) process.send({ type: 'call', ns: 'overlays.alerts', fnc: 'overlay', args: [opts] })
      return
    }
    opts.parameters = await new Message(opts.parameters).parse()

    let send = []
    let objectString = opts.parameters.trim().split(' | ')
    _.each(objectString, function (o) {
      let object = {}
      let settings = o.match(/([\w-]+)=([\w-://.%?=$_|@&]+|'[\S ]+')/g)
      _.each(settings, function (s) {
        let data = { key: s.split(/=(.+)/)[0], value: s.split(/=(.+)/)[1] }
        if (data.key === 'text') {
          data.value = data.value.replace(/\$sender/g, opts.sender.username)
          data.value = data.value.substr(1).slice(0, -1)
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
        let clip = { data: [] }
        if (!_.isNil(object.id)) clip = await global.api.getClipById(object.id)
        else if (!_.isNil(object.url)) clip = await global.api.getClipById(object.url.split('/').pop())
        for (let c of clip.data) {
          object.url = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4')
        }
      }
    }

    global.panel.io
      .of('/' + this._name + '/' + this.constructor.name.toLowerCase())
      .emit('alert', send)
  }
}

module.exports = new Alerts()
