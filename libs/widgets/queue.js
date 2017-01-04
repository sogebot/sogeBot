'use strict'

var _ = require('lodash')
var log = global.log

function QueueWidget () {

  global.panel.addWidget('queue', 'Queue', 'heart-empty')
}
/*
BetsWidget.prototype.sendConfiguration = function (self, socket) {
  socket.emit('betsConfiguration', {
    betCloseTimer: global.configuration.getValue('betCloseTimer'),
    betPercentGain: global.configuration.getValue('betPercentGain')
  })
}

BetsWidget.prototype.getBetsTemplates = function (self, socket) {
  global.botDB.findOne({ _id: 'bets_template' }, function (err, item) {
    if (err) log.error(err)
    if (!_.isNull(item)) {
      socket.emit('betsTemplates', item.options)
    }
  })
}

BetsWidget.prototype.getRunningBet = function (self, socket) {
  global.botDB.findOne({_id: 'bet'}, function (err, item) {
    if (err) log.error(err)
    if (_.isNull(item)) socket.emit('runningBet', null)
    else {
      item.timerEnd = global.systems.bets.timerEnd
      socket.emit('runningBet', item)
    }
  })
}

BetsWidget.prototype.closeBet = function (self, socket, option) {
  global.parser.parse({username: global.configuration.get().twitch.owner}, '!bet ' + (option === 'refund' ? option : 'close ' + option))
}

BetsWidget.prototype.reuseBet = function (self, socket, options) {
  global.parser.parse({username: global.configuration.get().twitch.owner}, '!bet open ' + options.join(' '))
}

BetsWidget.prototype.removeBetTemplate = function (self, socket, options) {
  global.botDB.update({ _id: 'bets_template' }, { $pull: { options: options } }, {})
  self.getBetsTemplates(self, socket)
}
*/
module.exports = new QueueWidget()
