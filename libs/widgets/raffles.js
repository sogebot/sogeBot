'use strict'

var _ = require('lodash')
var log = global.log

function RafflesWidget () {
  this.timerEnd = 0

  global.panel.addWidget('raffles', 'Raffles', 'knight')
}

module.exports = new RafflesWidget()
