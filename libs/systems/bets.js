'use strict'

// 3rdparty libraries
var _ = require('lodash')
var crypto = require('crypto')

// bot libraries
var constants = require('../constants')
var Points = require('./points')
var log = global.log

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
  this.templates = {}

  if (global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!bet open', this.open, constants.MODS)
    global.parser.register(this, '!bet close', this.close, constants.MODS)
    global.parser.register(this, '!bet refund', this.refundAll, constants.MODS)
    global.parser.register(this, '!bet', this.save, constants.VIEWERS)

    global.parser.registerHelper('!bet')

    global.configuration.register('betPercentGain', 'bets.betPercentGain', 'number', 20)
    global.configuration.register('betCloseTimer', 'bets.betCloseTimer', 'number', 2)

    global.watcher.watch(this, 'templates', this._save)
    this._update(this)
  }
}

Bets.prototype._update = function (self) {
  global.botDB.findOne({ _id: 'bets_template' }, function (err, item) {
    if (err) return log.error(err)
    if (_.isNull(item)) return

    delete item._id
    self.templates = item
  })
}

Bets.prototype._save = function (self) {
  if (_.size(self.templates) > 0) global.botDB.update({ _id: 'bets_template' }, { $set: self.templates }, { upsert: true })
  else global.botDB.remove({ _id: 'bets_template' })
}

Bets.prototype.open = function (self, sender, text) {
  try {
    var parsed = text.match(/([\u0500-\u052F\u0400-\u04FF\S]+)/g)
    if (parsed.length < 2) { throw new Error(ERROR_NOT_ENOUGH_OPTIONS) }
    if (!_.isNull(self.bet)) { throw new Error(ERROR_ALREADY_OPENED) }

    self.bet = {locked: false, bets: {}}
    _.each(parsed, function (option) { self.bet.bets[option] = {} })
    global.commons.sendMessage(global.translate('bets.opened', {username: global.configuration.get().twitch.channel})
      .replace('(options)', Object.keys(self.bet.bets).join(' | '))
      .replace('(minutes)', global.configuration.getValue('betCloseTimer')), sender)

    self.bet.end = new Date().getTime() + (parseInt(global.configuration.getValue('betCloseTimer'), 10) * 1000 * 60)
    self.saveTemplate(self, Object.keys(self.bet.bets))

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
        global.commons.sendMessage(global.translate('bets.running').replace('(options)', Object.keys(self.bet.bets).join(' | ')), sender)
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

Bets.prototype.saveTemplate = function (self, bOptions) {
  let id = crypto.createHash('md5').update(bOptions.toString()).digest('hex').substring(0, 5)
  if (_.isUndefined(self.templates[id])) {
    self.templates[id] = {_id: id, values: bOptions, added: new Date().getTime()}
  } else {
    self.templates[id].added = new Date().getTime()
  }
  if (_.size(self.templates) > 1) {
    let template = _.find(self.templates, function (o) { return o.added === _.map(self.templates, 'added').sort()[0] })
    delete self.templates[template._id]
  }
}

Bets.prototype.info = function (self, sender) {
  if (_.isNull(self.bet)) global.commons.sendMessage(global.translate('bets.notRunning'), sender)
  else {
    global.commons.sendMessage(global.translate(self.bet.locked ? 'bets.lockedInfo' : 'bets.info')
      .replace('(options)', Object.keys(self.bet.bets).join(' | '))
      .replace('(time)', parseFloat((self.bet.end - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
  }
}

Bets.prototype.saveBet = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) (\d+)$/)
    if (parsed.length < 2) { throw new Error(ERROR_NOT_ENOUGH_OPTIONS) }

    let bet = { option: parsed[1], amount: parsed[2] }

    if (parseInt(bet.amount, 10) === 0) throw Error(ERROR_ZERO_BET)
    if (_.isNull(self.bet)) throw Error(ERROR_NOT_RUNNING)
    if (_.isUndefined(self.bet.bets[bet.option])) throw Error(ERROR_UNDEFINED_BET)
    if (self.bet.locked) throw Error(ERROR_IS_LOCKED)
    if (!_.isUndefined(_.find(self.bet.bets, function (o, i) { return _.includes(Object.keys(o), sender.username) && i !== bet.option }))) throw Error(ERROR_DIFF_BET)

    var percentGain = (Object.keys(self.bet.bets).length * parseInt(global.configuration.getValue('betPercentGain'), 10)) / 100

    const user = global.users.get(sender.username)
    var availablePts = parseInt(user.points, 10)
    var removePts = parseInt(bet.amount, 10)
    if (!_.isFinite(availablePts) || !_.isNumber(availablePts) || availablePts < removePts) {
      global.commons.sendMessage(global.translate('bets.notEnoughPoints')
        .replace('(amount)', removePts)
        .replace('(pointsName)', Points.getPointsName(removePts)), sender)
    } else {
      var newBet = _.isUndefined(self.bet.bets[bet.option][sender.username]) ? removePts : parseInt(self.bet.bets[bet.option][sender.username], 10) + removePts
      self.bet.bets[bet.option][sender.username] = newBet
      global.users.set(sender.username, { points: availablePts - removePts })

      global.commons.sendMessage(global.translate('bets.newBet')
        .replace('(option)', bet.option)
        .replace('(amount)', newBet)
        .replace('(pointsName)', Points.getPointsName(newBet))
        .replace('(winAmount)', Math.round((parseInt(newBet, 10) * percentGain)))
        .replace('(winPointsName)', Points.getPointsName(Math.round((parseInt(newBet, 10) * percentGain)))), sender)
    }
  } catch (e) {
    switch (e.message) {
      case ERROR_ZERO_BET:
        global.commons.sendMessage(global.translate('bets.zeroBet')
          .replace('(pointsName)', Points.getPointsName(0)), sender)
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
        global.commons.sendMessage(global.translate('bets.diffBet').replace('(option)', Object.keys(result)[0]), sender)
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
        const user = global.users.get(buser)
        var availablePts = parseInt(user.points, 10)
        var addPts = parseInt(bet, 10)
        global.users.set(buser, { points: availablePts + addPts })
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
      const user = global.users.get(buser)
      var availablePts = parseInt(user.points, 10)
      var addPts = parseInt(bet, 10) + Math.round((parseInt(bet, 10) * percentGain))
      global.users.set(buser, { points: availablePts + addPts })
    })

    global.commons.sendMessage(global.translate('bets.closed')
      .replace('(option)', wOption)
      .replace('(amount)', usersToPay.length), sender)
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
