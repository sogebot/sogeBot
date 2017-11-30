'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
var Points = require('./points')

const ERROR_NOT_ENOUGH_OPTIONS = '0'
const ERROR_ALREADY_OPENED = '1'
const ERROR_ZERO_BET = '2'
const ERROR_NOT_RUNNING = '3'
const ERROR_UNDEFINED_BET = '4'
const ERROR_IS_LOCKED = '5'
const ERROR_DIFF_BET = '6'
const ERROR_NOT_OPTION = '7'

/*
 * !bet                                 - gets an info about bet
 * !bet [option] [amount]               - bet [amount] of points on [option]
 * !bet open [option option option ...] - open a new bet with selected options
 * !bet close [option]                  - close a bet and select option as winner
 * !bet close refundall                 - close a bet and refund all participants
 * !set betPercentGain [0-100]          - sets amount of gain per option
 * !set betCloseTimer [minutes]         - amount of minutes when you can bet
 */

function Bets () {
  this.modifiedTime = new Date().getTime()

  this.timer = null
  this.bet = null

  if (global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!bet open', this.open, constants.MODS)
    global.parser.register(this, '!bet close', this.close, constants.MODS)
    global.parser.register(this, '!bet refund', this.refundAll, constants.MODS)
    global.parser.register(this, '!bet', this.save, constants.VIEWERS)

    global.parser.registerHelper('!bet')

    global.configuration.register('betPercentGain', 'bets.betPercentGain', 'number', 20)
    global.configuration.register('betCloseTimer', 'bets.betCloseTimer', 'number', 2)
  }
}

Bets.prototype.open = function (self, sender, text) {
  try {
    var parsed = text.match(/([\u0500-\u052F\u0400-\u04FF\S]+)/g)
    if (parsed.length < 2) { throw new Error(ERROR_NOT_ENOUGH_OPTIONS) }
    if (!_.isNull(self.bet)) { throw new Error(ERROR_ALREADY_OPENED) }

    self.bet = {locked: false, bets: {}}
    _.each(parsed, function (option) { self.bet.bets[option] = {} })
    global.commons.sendMessage(global.translate('bets.opened', {username: global.configuration.get().twitch.channel})
      .replace(/\$options/g, Object.keys(self.bet.bets).join(' | '))
      .replace(/\$minutes/g, global.configuration.getValue('betCloseTimer')), sender)

    self.bet.end = new Date().getTime() + (parseInt(global.configuration.getValue('betCloseTimer'), 10) * 1000 * 60)
    // TODO: self.saveTemplate(self, Object.keys(self.bet.bets))

    self.timer = setTimeout(function () {
      self.bet.locked = true
      self.bet.count = 0
      _.each(self.bet.bets, function (bet) { self.bet.count += _.size(bet) })
      if (self.bet.count > 0) global.commons.sendMessage(global.translate('bets.locked'), {username: global.configuration.get().twitch.channel})
      else {
        global.commons.sendMessage(global.translate('bets.removed'), sender)
        self.bet = null
      }
    }, parseInt(global.configuration.getValue('betCloseTimer'), 10) * 1000 * 60)
  } catch (e) {
    switch (e.message) {
      case ERROR_ALREADY_OPENED:
        global.commons.sendMessage(global.translate('bets.running').replace(/\$options/g, Object.keys(self.bet.bets).join(' | ')), sender)
        break
      case ERROR_NOT_ENOUGH_OPTIONS:
        global.commons.sendMessage(global.translate('bets.notEnoughOptions'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  } finally {
    self.modifiedTime = new Date().getTime()
  }
}

Bets.prototype.info = function (self, sender) {
  if (_.isNull(self.bet)) global.commons.sendMessage(global.translate('bets.notRunning'), sender)
  else {
    global.commons.sendMessage(global.translate(self.bet.locked ? 'bets.lockedInfo' : 'bets.info')
      .replace(/\$options/g, Object.keys(self.bet.bets).join(' | '))
      .replace(/\$time/g, parseFloat((self.bet.end - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
  }
}

Bets.prototype.saveBet = async function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) (\d|all+)$/)
    if (parsed.length < 2) { throw new Error(ERROR_NOT_ENOUGH_OPTIONS) }

    const user = await global.users.get(sender.username)
    let bet = { option: parsed[1], amount: parsed[2] === 'all' && !_.isNil(user.points) ? user.points : parsed[2] }

    if (parseInt(bet.amount, 10) === 0) throw Error(ERROR_ZERO_BET)
    if (_.isNull(self.bet)) throw Error(ERROR_NOT_RUNNING)
    if (_.isUndefined(self.bet.bets[bet.option])) throw Error(ERROR_UNDEFINED_BET)
    if (self.bet.locked) throw Error(ERROR_IS_LOCKED)
    if (!_.isUndefined(_.find(self.bet.bets, function (o, i) { return _.includes(Object.keys(o), sender.username) && i !== bet.option }))) throw Error(ERROR_DIFF_BET)

    var percentGain = (Object.keys(self.bet.bets).length * parseInt(global.configuration.getValue('betPercentGain'), 10)) / 100

    var availablePts = parseInt(user.points, 10)
    var removePts = parseInt(bet.amount, 10)
    if (!_.isFinite(availablePts) || !_.isNumber(availablePts) || availablePts < removePts) {
      global.commons.sendMessage(global.translate('bets.notEnoughPoints')
        .replace(/\$amount/g, removePts)
        .replace(/\$pointsName/g, Points.getPointsName(removePts)), sender)
    } else {
      var newBet = _.isUndefined(self.bet.bets[bet.option][sender.username]) ? removePts : parseInt(self.bet.bets[bet.option][sender.username], 10) + removePts
      self.bet.bets[bet.option][sender.username] = newBet
      global.db.engine.increment('users', { username: sender.username }, { points: parseInt(removePts, 10) * -1 })

      global.commons.sendMessage(global.translate('bets.newBet')
        .replace(/\$option/g, bet.option)
        .replace(/\$amount/g, newBet)
        .replace(/\$pointsName/g, Points.getPointsName(newBet))
        .replace(/\$winAmount/g, Math.round((parseInt(newBet, 10) * percentGain)))
        .replace(/\$winPointsName/g, Points.getPointsName(Math.round((parseInt(newBet, 10) * percentGain)))), sender)
    }
  } catch (e) {
    switch (e.message) {
      case ERROR_ZERO_BET:
        global.commons.sendMessage(global.translate('bets.zeroBet')
          .replace(/\$pointsName/g, Points.getPointsName(0)), sender)
        break
      case ERROR_NOT_RUNNING:
        global.commons.sendMessage(global.translate('bets.notRunning'), sender)
        break
      case ERROR_UNDEFINED_BET:
        global.commons.sendMessage(global.translate('bets.undefinedBet'), sender)
        break
      case ERROR_IS_LOCKED:
        global.commons.sendMessage(global.translate('bets.timeUpBet'), sender)
        break
      case ERROR_DIFF_BET:
        let result = _.pickBy(self.bet.bets, function (v, k) { return _.includes(Object.keys(v), sender.username) })
        global.commons.sendMessage(global.translate('bets.diffBet').replace(/\$option/g, Object.keys(result)[0]), sender)
        break
      default:
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  }
}

Bets.prototype.refundAll = function (self, sender) {
  try {
    if (_.isNull(self.bet)) throw Error(ERROR_NOT_RUNNING)
    _.each(self.bet.bets, function (users) {
      _.each(users, function (bet, buser) {
        global.db.engine.increment('users', { username: buser }, { points: parseInt(bet, 10) })
      })
    })
    global.commons.sendMessage(global.translate('bets.refund'), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_NOT_RUNNING:
        global.commons.sendMessage(global.translate('bets.notRunning'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  } finally {
    self.bet = null
    clearTimeout(self.timer)
    self.modifiedTime = new Date().getTime()
  }
}

Bets.prototype.close = function (self, sender, text) {
  try {
    var wOption = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]
    var usersToPay = []

    if (_.isNull(self.bet)) throw Error(ERROR_NOT_RUNNING)
    if (_.isUndefined(self.bet.bets[wOption])) throw Error(ERROR_NOT_OPTION)

    var percentGain = (Object.keys(self.bet.bets).length * parseInt(global.configuration.getValue('betPercentGain'), 10)) / 100
    _.each(self.bet.bets[wOption], function (bet, buser) {
      usersToPay.push(buser)
      global.db.engine.increment('users', { username: buser }, { points: parseInt(bet, 10) + Math.round((parseInt(bet, 10) * percentGain)) })
    })

    global.commons.sendMessage(global.translate('bets.closed')
      .replace(/\$option/g, wOption)
      .replace(/\$amount/g, usersToPay.length), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_NOT_RUNNING:
        global.commons.sendMessage(global.translate('bets.notRunning'), sender)
        break
      case ERROR_NOT_OPTION:
        global.commons.sendMessage(global.translate('bets.notOption'), sender)
        break
      default:
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  } finally {
    self.bet = null
    clearTimeout(self.timer)
    self.modifiedTime = new Date().getTime()
  }
}

Bets.prototype.save = function (self, sender, text) {
  if (text.length === 0) self.info(self, sender)
  else self.saveBet(self, sender, text)
}

module.exports = new Bets()
