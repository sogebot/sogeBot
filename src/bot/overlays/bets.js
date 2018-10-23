// @flow
'use strict'

const Overlay = require('./_interface')

class Bets extends Overlay {
  timeouts: TimeoutsObject = {}
  modifiedAt: number = 0
  currentBet: Object = {}
  bets: Array<Object> = []

  constructor () {
    // define special property name as readonly
    const ui = {
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/bets',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/bets',
          target: '_blank'
        }
      }
    }

    super({ ui })

    if (require('cluster').isMaster) {
      this.interval()
    }
  }

  async interval () {
    clearTimeout(this.timeouts['betsInterval'])

    try {
      let _modifiedAt = await global.db.engine.findOne(global.systems.bets.collection.data, { key: 'betsModifiedTime' })
      if (this.modifiedAt !== _modifiedAt) {
        this.modifiedAt = _modifiedAt
        this.currentBet = await global.db.engine.findOne(global.systems.bets.collection.data, { key: 'bets' })
        this.bets = await global.db.engine.find(global.systems.bets.collection.users)
      }
    } catch (e) {
      global.log.error(e.stack)
    } finally {
      this.timeouts['betsInterval'] = setTimeout(() => this.interval(), 1000)
    }
  }

  sockets () {
    global.panel.io.of('/overlays/bets').on('connection', (socket) => {
      socket.on('data', async (callback) => {
        callback(this.currentBet, this.bets)
      })
    })
  }
}

module.exports = new Bets()
