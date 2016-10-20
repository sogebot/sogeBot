'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var log = global.log

/*
 * !raffle                                           - gets an info about raffle
 * !raffle open [raffle-keyword] [timer] [followers] - open a new raffle with selected keyword, auto close after timer (in minutes, default: 0 - disabled), for followers? (optional)
 * !raffle close                                     - close a raffle manually
 * !raffle pick                                      - pick or repick a winner of raffle
 * ![raffle-keyword]                                 - join a raffle
 * !set raffleAnnounceInterval [minutes]             - reannounce raffle interval each x minutes
 */

function Raffles () {
  if (global.configuration.get().systems.raffles === true) {
    this.timer = null

    global.parser.register(this, '!raffle open', this.open, constants.VIEWERS)
    global.parser.register(this, '!raffle', this.info, constants.VIEWERS)
    global.parser.registerHelper('!raffle')
    global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 1) // TODO: change to something better
  }
  log.info('Raffles system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.raffles === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Raffles.prototype.info = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      if (!item.locked) {
        global.commons.sendMessage(global.translate(item.timer !== 0 ? 'raffle.info.opened' : 'raffle.info.openedWithoutTime')
          .replace('(keyword)', item.keyword)
          .replace('(time)', parseFloat((item.timer - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
      } else {
        global.commons.sendMessage(global.translate('raffle.info.closed'), sender)
      }
    } else {
      global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
    }
  })
}

Raffles.prototype.open = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+) ?(\d+)? ?(followers)?/)
    var groups = { keyword: 1, timer: 2, followers: 3 }
    var raffle = {
      keyword: parsed[groups.keyword],
      timer: parsed[groups.timer] ? new Date().getTime() + parsed[groups.timer] * 60 * 1000 : 0,
      followers: parsed[groups.followers] != null,
      participants: []
    }

    global.botDB.findOne({_id: 'raffle'}, function (err, item) {
      if (err) return log.error(err)
      if (!_.isNull(item)) {
        global.commons.sendMessage(global.translate('raffle.open.running')
          .replace('(keyword)', item.keyword), sender)
        return
      }

      global.botDB.update({_id: 'raffle'}, {$set: raffle}, {upsert: true}, function (err) {
        if (err) return log.error(err)
        global.commons.sendMessage(global.translate(raffle.timer !== 0 ? 'raffle.open.ok' : 'raffle.open.okWithoutTime')
          .replace('(keyword)', raffle.keyword)
          .replace('(time)', parseFloat((parseInt(raffle.timer, 10) - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)

        // add timer if raffleAnnounceInterval is set
        if (global.configuration.getValue('raffleAnnounceInterval')) {
          self.timer = setInterval(function () {
            global.commons.sendMessage(global.translate(raffle.timer !== 0 ? 'raffle.open.notice' : 'raffle.open.noticeWithoutTime')
              .replace('(keyword)', raffle.keyword)
              .replace('(time)', parseFloat((parseInt(raffle.timer, 10) - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
          }, global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000)
        }
      })
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('raffle.open.error'))
  }

}

module.exports = new Raffles()
