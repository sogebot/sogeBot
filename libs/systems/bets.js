'use strict'

var chalk = require('chalk')
var constants = require('../constants')
var User = require('../user')
var Points = require('./points')
var _ = require('lodash')
var log = global.log

const ERROR_NOT_ENOUGH_OPTIONS = '0'

/**
 * !bet                                 - gets an info about bet
 * !bet [option] [amount]               - bet [amount] of points on [option]
 * !bet open [option option option ...] - open a new bet with selected options
 * !bet close [option]                  - close a bet and select option as winner
 * !bet close refundall                 - close a bet and refund all participants
 * !set betPercentGain [0-100]          - sets amount of gain per option
 * !set betCloseTimer [minutes]         - amount of minutes when you can bet
 */

function Bets () {
  this.timer = null
  this.timerEnd = 0

  if (global.configuration.get().systems.points === true && global.configuration.get().systems.bets === true) {
    global.parser.register(this, '!bet open', this.open, constants.MODS)
    global.parser.register(this, '!bet close', this.close, constants.MODS)
    global.parser.register(this, '!bet refund', this.refundAll, constants.MODS)
    global.parser.register(this, '!bet', this.bet, constants.VIEWERS)

    global.parser.registerHelper('!bet')

    global.configuration.register('betPercentGain', 'bets.betPercentGain', 'number', 20)
    global.configuration.register('betCloseTimer', 'bets.betCloseTimer', 'number', 2)

    // close any bets
    this.refundAll(this, null)
  }
  log.info('Bets (game) system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.points === true && global.configuration.get().systems.alias === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Bets.prototype.open = function (self, sender, text) {
  try {
    var parsed = text.match(/(\w+)/g)
    if (parsed.length < 2) { throw new Error(ERROR_NOT_ENOUGH_OPTIONS) }
    global.botDB.findOne({_id: 'bet'}, function (err, item) {
      if (err) log.error(err)
      if (!_.isNull(item)) { // cannot open new bet if old one wasn't closed
        global.commons.sendMessage(global.translate('bets.running').replace('(options)', parsed.join(' | ')), sender)
      } else { // open new bet
        var bOptions = {}
        _.each(parsed, function (option) { bOptions[option] = {} })
        global.botDB.update({_id: 'bet'}, {$set: {bets: bOptions, locked: false}}, {upsert: true}, function (err) {
          if (err) log.error(err)
          global.commons.sendMessage(global.translate('bets.opened', {username: global.configuration.get().twitch.owner})
            .replace('(options)', parsed.join(' | '))
            .replace('(minutes)', global.configuration.getValue('betCloseTimer')), sender)
        })
        self.timer = setTimeout(function () {
          global.botDB.update({_id: 'bet'}, {$set: {locked: true}}, {}, function (err) {
            if (err) log.error(err)
            global.commons.sendMessage(global.translate('bets.locked'), {username: global.configuration.get().twitch.owner})
          })
        }, parseInt(global.configuration.getValue('betCloseTimer'), 10) * 1000 * 60)
        self.timerEnd = new Date().getTime() + (parseInt(global.configuration.getValue('betCloseTimer'), 10) * 1000 * 60)
        self.saveBetTemplate(self, bOptions)
      }
    })
  } catch (e) {
    switch (e.message) {
      case ERROR_NOT_ENOUGH_OPTIONS:
        global.commons.sendMessage(global.translate('bets.notEnoughOptions'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  }
}

Bets.prototype.saveBetTemplate = function (self, bOptions) {
  var aOptions = []
  _.each(bOptions, function (v, i) { aOptions.push(i) })
  global.botDB.update({ _id: 'bets_template' }, { $addToSet: { options: aOptions } }, { upsert: true })
  global.botDB.findOne({ _id: 'bets_template' }, function (err, item) {
    if (err) log.error(err)
    if (!_.isNull(item)) {
      var rmCount = item.options.length - 5
      while (rmCount > 0) {
        global.botDB.update({ _id: 'bets_template' }, { $pop: { options: -1 } }, {})
        rmCount = rmCount - 1
      }
    }
  })
}

Bets.prototype.info = function (self, sender) {
  global.botDB.findOne({_id: 'bet'}, function (err, item) {
    if (err) log.error(err)
    if (!_.isNull(item)) {
      if (!item.locked) {
        global.commons.sendMessage(global.translate('bets.info')
          .replace('(options)', Object.keys(item.bets).join(' | '))
          .replace('(time)', parseFloat((self.timerEnd - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
      } else {
        global.commons.sendMessage(global.translate('bets.lockedInfo'), sender)
      }
    } else {
      global.commons.sendMessage(global.translate('bets.notRunning'), sender)
    }
  })
}

Bets.prototype.saveBet = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+) (\d+)$/)
    if (parsed.length < 2) { throw new Error() }

    var betTo = parsed[1]
    var amount = parsed[2]

    if (parseInt(amount, 10) === 0) {
      global.commons.sendMessage(global.translate('bets.zeroBet')
        .replace('(pointsName)', Points.getPointsName(0)), sender)
      return
    }

    global.botDB.findOne({_id: 'bet'}, function (err, item) {
      if (err) log.error(err)
      if (_.isNull(item)) {
        global.commons.sendMessage(global.translate('bets.notRunning'), sender)
      } else {
        if (_.isUndefined(item.bets[betTo])) {
          global.commons.sendMessage(global.translate('bets.undefinedBet'), sender)
          return
        }

        // check if time expired
        if (item.locked) {
          global.commons.sendMessage(global.translate('bets.timeUpBet'), sender)
          return
        }

        // check if already bet
        var diffBet = false
        _.each(item.bets, function (val, key) {
          if (!_.isUndefined(val[sender.username]) && betTo !== key) {
            diffBet = true
            global.commons.sendMessage(global.translate('bets.diffBet').replace('(option)', key), sender)
          }
        })
        if (diffBet) return

        var percentGain = (Object.keys(item.bets).length * parseInt(global.configuration.getValue('betPercentGain'), 10)) / 100
        var user = new User(sender.username)
        user.isLoaded().then(function () {
          var availablePts = parseInt(user.get('points'), 10)
          var removePts = parseInt(amount, 10)
          if (!_.isFinite(availablePts) || !_.isNumber(availablePts) || availablePts < removePts) {
            global.commons.sendMessage(global.translate('bets.notEnoughPoints')
              .replace('(amount)', removePts)
              .replace('(pointsName)', Points.getPointsName(removePts)), sender)
          } else {
            var newBet = _.isUndefined(item.bets[betTo][sender.username]) ? removePts : parseInt(item.bets[betTo][sender.username], 10) + removePts
            item.bets[betTo][sender.username] = newBet
            user.set('points', availablePts - removePts)
            global.botDB.update({_id: 'bet'}, {$set: {bets: item.bets}}, {}, function (err, numReplaced) {
              if (err) log.error(err)
              else {
                global.commons.sendMessage(global.translate('bets.newBet')
                  .replace('(option)', betTo)
                  .replace('(amount)', newBet)
                  .replace('(pointsName)', Points.getPointsName(newBet))
                  .replace('(winAmount)', Math.round((parseInt(newBet, 10) * percentGain) + newBet))
                  .replace('(winPointsName)', Points.getPointsName(Math.round((parseInt(newBet, 10) * percentGain)))), sender)
              }
            })
          }
        })
      }
    })
  } catch (e) {
    global.commons.sendMessage(global.translate('core.error'), sender)
  }
}

Bets.prototype.refundAll = function (self, sender) {
  global.botDB.findOne({_id: 'bet'}, function (err, item) {
    if (err) log.error(err)
    if (_.isNull(item)) {
      global.commons.sendMessage(global.translate('bets.notRunning'), sender)
      return
    } else {
      _.each(item.bets, function (users) {
        _.each(users, function (bet, buser) {
          var user = new User(buser)
          user.isLoaded().then(function () {
            var availablePts = parseInt(user.get('points'), 10)
            var addPts = parseInt(bet, 10)
            user.set('points', availablePts + addPts)
          })
        })
      })
      global.commons.sendMessage(global.translate('bets.refund'), sender)
    }
  })

  global.botDB.remove({_id: 'bet'}, {}, function (err) {
    if (err) log.error(err)
    // clear possible timeout
    clearTimeout(self.timer)
  })
}

Bets.prototype.close = function (self, sender, text) {
  try {
    var wOption = text.match(/^(\w+)$/)[1]
    var usersToPay = []

    global.botDB.findOne({_id: 'bet'}, function (err, item) {
      if (err) log.error(err)
      if (_.isNull(item)) {
        global.commons.sendMessage(global.translate('bets.notRunning'), sender)
        return
      } else if (!_.isUndefined(item.bets[wOption])) {
        var percentGain = (Object.keys(item.bets).length * parseInt(global.configuration.getValue('betPercentGain'), 10)) / 100
        _.each(item.bets[wOption], function (bet, buser) {
          usersToPay.push(buser)
          var user = new User(buser)
          user.isLoaded().then(function () {
            var availablePts = parseInt(user.get('points'), 10)
            var addPts = parseInt(bet, 10) + Math.round((parseInt(bet, 10) * percentGain))
            user.set('points', availablePts + addPts)
          })
        })
      } else {
        global.commons.sendMessage(global.translate('bets.notOption'), sender)
        return
      }

      global.botDB.remove({_id: 'bet'}, {}, function (err) {
        if (err) log.error(err)
        global.commons.sendMessage(global.translate('bets.closed')
          .replace('(option)', wOption)
          .replace('(amount)', usersToPay.length), sender)

        // clear possible timeout
        clearTimeout(self.timer)
      })
    })
  } catch (e) {
    global.commons.sendMessage(global.translate('core.error'), sender)
  }
}

Bets.prototype.bet = function (self, sender, text) {
  if (text.length === 0) self.info(self, sender)
  else self.saveBet(self, sender, text)
}

module.exports = new Bets()
