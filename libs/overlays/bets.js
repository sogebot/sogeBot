const debug = require('debug')
const _ = require('lodash')

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
      let _modifiedAt = await global.db.engine.findOne('cache', { key: 'betsModifiedTime' })
      if (this.modifiedAt !== _modifiedAt) {
        this.modifiedAt = _modifiedAt
        this.currentBet = await global.db.engine.findOne('cache', { key: 'bets' })
        this.bets = await global.db.engine.find('bets.users')
      }
    } catch (e) {
      global.log.error(e.stack)
    } finally {
      if (!_.isNil(this.timeouts.interval)) clearTimeout(this.timeouts.interval)
      this.timeouts.interval = setTimeout(() => this.interval(), 1000)
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
