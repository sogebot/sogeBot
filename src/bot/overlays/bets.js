const debug = require('debug')

const Timeout = require('../timeout')

class BetsOverlay {
  constructor () {
    this.timeouts = {}
    this.modifiedAt = 0
    this.currentBet = {}
    this.bets = []

    if (require('cluster').isMaster) {
      this.sockets()
      this.interval()
    }
  }

  async interval () {
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
      new Timeout().recursive({ uid: 'betsInterval', this: this, fnc: this.interval, wait: 1000 })
    }
  }

  sockets () {
    const d = debug('BetsOverlay:sockets')

    global.panel.io.of('/overlays/bets').on('connection', (socket) => {
      d('Socket /overlays/bets connected, registering sockets')

      socket.on('data', async (callback) => {
        callback(this.currentBet, this.bets)
      })
    })
  }
}

module.exports = new BetsOverlay()
