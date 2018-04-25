'use strict'

const _ = require('lodash')

function BetsWidget () {
  if (!global.commons.isSystemEnabled('bets') || require('cluster').isWorker) return
  this.cachedTime = 0

  global.panel.addWidget('bets', 'widget-title-bets', 'far fa-money-bill-alt')
  global.panel.socketListening(this, 'getBetsTemplates', this.getBetsTemplates)
  global.panel.socketListening(this, 'getRunningBet', this.getRunningBet)
  global.panel.socketListening(this, 'closeBet', this.closeBet)
  global.panel.socketListening(this, 'reuseBet', this.reuseBet)
  global.panel.socketListening(this, 'removeBetTemplate', this.removeBetTemplate)
  global.panel.socketListening(this, 'getBetsConfiguration', this.sendConfiguration)

  var self = this
  setInterval(function () {
    self.getRunningBet(self, global.panel.io)
    self.getBetsTemplates(self, global.panel.io)
  }, 1000)
}

BetsWidget.prototype.sendConfiguration = async function (self, socket) {
  socket.emit('betsConfiguration', {
    betCloseTimer: await global.configuration.getValue('betCloseTimer'),
    betPercentGain: await global.configuration.getValue('betPercentGain')
  })
}

BetsWidget.prototype.getBetsTemplates = function (self, socket) {
  socket.emit('betsTemplates', null) // TODO: Fix templates
}

BetsWidget.prototype.getRunningBet = async function (self, socket) {
  socket.emit('runningBet', await global.db.engine.findOne('cache', { key: 'bets' }))
}

BetsWidget.prototype.closeBet = function (self, socket, option) {
  const message = '!bet ' + (option === 'refund' ? option : 'close ' + option)
  global.log.process({ type: 'parse', sender: { username: global.commons.getOwner() }, message: message })
  _.sample(require('cluster').workers).send({ type: 'message', sender: { username: global.commons.getOwner() }, message: message, skip: true })
}

BetsWidget.prototype.reuseBet = function (self, socket, options) {
  const message = '!bet open ' + options.join(' ')
  global.log.process({ type: 'parse', sender: { username: global.commons.getOwner() }, message: message })
  _.sample(require('cluster').workers).send({ type: 'message', sender: { username: global.commons.getOwner() }, message: message, skip: true })
}

BetsWidget.prototype.removeBetTemplate = function (self, socket, id) {
  delete global.systems.bets.templates[id]
  self.getBetsTemplates(self, socket)
}

module.exports = new BetsWidget()
