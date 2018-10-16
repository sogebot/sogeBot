'use strict'

const _ = require('lodash')

const Overlay = require('./_interface')

class Stats extends Overlay {
  constructor () {
    // define special property name as readonly
    const ui = {
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/stats',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/stats (500x55)',
          target: '_blank'
        }
      }
    }

    super({ ui })
    if (require('cluster').isMaster) this.sockets()
  }

  sockets () {
    global.panel.io.of('/overlays/stats').on('connection', (socket) => {
      socket.on('get', async (cb) => {
        const when = await global.cache.when()
        const stats = {
          uptime: global.commons.getTime(await global.cache.isOnline() ? when.online : 0, false),
          viewers: _.get(await global.db.engine.findOne('api.current', { key: 'viewers' }), 'value', 0),
          followers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
          subscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
          bits: _.get(await global.db.engine.findOne('api.current', { key: 'tips' }), 'value', 0)
        }
        cb(stats)
      })
    })
  }
}

module.exports = new Stats()
