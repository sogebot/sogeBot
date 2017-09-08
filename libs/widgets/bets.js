'use strict'

function BetsWidget () {
  if (!global.commons.isSystemEnabled('bets')) return
  this.cachedTime = 0

  global.panel.addWidget('bets', 'widget-title-bets', 'knight')
  global.panel.socketListening(this, 'getBetsTemplates', this.getBetsTemplates)
  global.panel.socketListening(this, 'getRunningBet', this.getRunningBet)
  global.panel.socketListening(this, 'closeBet', this.closeBet)
  global.panel.socketListening(this, 'reuseBet', this.reuseBet)
  global.panel.socketListening(this, 'removeBetTemplate', this.removeBetTemplate)
  global.panel.socketListening(this, 'getBetsConfiguration', this.sendConfiguration)

  var self = this
  setInterval(function () {
    if (global.systems.bets.modifiedTime !== self.cachedTime) {
      self.getRunningBet(self, global.panel.io)
      self.getBetsTemplates(self, global.panel.io)
      self.cachedTime = global.systems.bets.modifiedTime
    }
  }, 1000)
}

BetsWidget.prototype.sendConfiguration = function (self, socket) {
  socket.emit('betsConfiguration', {
    betCloseTimer: global.configuration.getValue('betCloseTimer'),
    betPercentGain: global.configuration.getValue('betPercentGain')
  })
}

BetsWidget.prototype.getBetsTemplates = function (self, socket) {
  socket.emit('betsTemplates', global.systems.bets.templates)
}

BetsWidget.prototype.getRunningBet = function (self, socket) {
  socket.emit('runningBet', global.systems.bets.bet)
}

BetsWidget.prototype.closeBet = function (self, socket, option) {
  global.parser.parse({username: global.configuration.get().twitch.channel}, '!bet ' + (option === 'refund' ? option : 'close ' + option))
}

BetsWidget.prototype.reuseBet = function (self, socket, options) {
  global.parser.parse({username: global.configuration.get().twitch.channel}, '!bet open ' + options.join(' '))
}

BetsWidget.prototype.removeBetTemplate = function (self, socket, id) {
  delete global.systems.bets.templates[id]
  self.getBetsTemplates(self, socket)
}

module.exports = new BetsWidget()
