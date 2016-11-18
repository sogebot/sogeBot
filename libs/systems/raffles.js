'use strict'

var User = require('../user')

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

    global.parser.register(this, '!raffle pick', this.pick, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle close', this.close, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle open', this.open, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle', this.info, constants.VIEWERS)
    global.parser.registerHelper('!raffle')
    global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)

    this.registerRaffleKeyword(this)
  }
  log.info('Raffles system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.raffles === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Raffles.prototype.registerRaffleKeyword = function (self) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      global.parser.register(this, '!' + item.keyword, self.participate, constants.VIEWERS)
    }
  })
}

Raffles.prototype.pick = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      var winner
      do { // we want different winner
        winner = _.sample(item.participants)
      } while (winner === item.winner && item.participants.length > 1)

      global.botDB.update({_id: 'raffle'}, {$set: {winner: winner, locked: true}}, {}, function (err) {
        if (err) return log.error(err)
        if (_.isUndefined(winner)) {
          global.commons.sendMessage(global.translate('raffle.pick.noParticipants'), sender)
        } else {
          global.commons.sendMessage(global.translate('raffle.pick.winner')
            .replace('(winner)', winner), sender)
        }
        global.parser.unregister('!' + item.keyword)
      })
    }
  })
}

Raffles.prototype.participate = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      if (item.followers) {
        var user = new User(sender.username)
        user.isLoaded().then(function () {
          if (user.get('isFollower')) { global.botDB.update({ _id: 'raffle' }, { $addToSet: { participants: sender.username } }, { upsert: true }) }
        })
      } else global.botDB.update({ _id: 'raffle' }, { $addToSet: { participants: sender.username } }, { upsert: true })
    }
  })
}

Raffles.prototype.info = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      if (!_.isNull(item.winner)) global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
      else if (!item.locked) {
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
      participants: [],
      locked: false,
      winner: null
    }

    global.botDB.findOne({_id: 'raffle'}, function (err, item) {
      if (err) return log.error(err)
      if (!_.isNull(item)) {
        if (item.locked) {
          global.commons.sendMessage(global.translate('raffle.open.locked'), sender)
        } else {
          global.commons.sendMessage(global.translate('raffle.open.running')
            .replace('(keyword)', item.keyword), sender)
        }
        return
      }

      global.botDB.update({_id: 'raffle'}, {$set: raffle}, {upsert: true}, function (err) {
        if (err) return log.error(err)
        global.commons.sendMessage(global.translate(raffle.timer !== 0 ? 'raffle.open.ok' : 'raffle.open.okWithoutTime')
          .replace('(keyword)', raffle.keyword)
          .replace('(time)', parseFloat((parseInt(raffle.timer, 10) - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)

        // register raffle keyword
        self.registerRaffleKeyword(self)

        // add timer if raffleAnnounceInterval is set
        if (global.configuration.getValue('raffleAnnounceInterval')) {
          self.timer = setInterval(function () {
            if ((parseInt(raffle.timer, 10) - new Date().getTime()) / 1000 / 60 < 0) {
              self.close(self, sender)
              clearInterval(self.timer)
            } else {
              global.commons.sendMessage(global.translate(raffle.timer !== 0 ? 'raffle.open.notice' : 'raffle.open.noticeWithoutTime')
                .replace('(keyword)', raffle.keyword)
                .replace('(time)', parseFloat((parseInt(raffle.timer, 10) - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
            }
          }, global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000)
        }
      })
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('raffle.open.error'))
  }
}

Raffles.prototype.close = function (self, sender, text) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      global.botDB.update({_id: 'raffle'}, {$set: {locked: true}}, {}, function (err) {
        if (err) return log.error(err)
        global.commons.sendMessage(global.translate('raffle.close.ok'), sender)

        clearInterval(self.timer)
        global.parser.unregister('!' + item.keyword)
      })
    } else {
      global.commons.sendMessage(global.translate('raffle.close.notRunning'), sender)
    }
  })
}

module.exports = new Raffles()

