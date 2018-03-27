'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')
const cluster = require('cluster')

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

class Bets {
  constructor () {
    if (global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled(this)) {
      global.configuration.register('betPercentGain', 'bets.betPercentGain', 'number', 20)
      global.configuration.register('betCloseTimer', 'bets.betCloseTimer', 'number', 2)

      if (cluster.isMaster) {
        this.checkIfBetExpired()
      }
    }
  }

  async checkIfBetExpired () {
    try {
      let currentBet = await global.db.engine.findOne('cache', { key: 'bets' })
      debug('bets:checkIfBetExpired')('Current bet object: %o', currentBet)
      if (_.isEmpty(currentBet) || currentBet.locked) throw Error(ERROR_NOT_RUNNING)

      const isExpired = currentBet.end <= new Date().getTime()
      debug('bets:checkIfBetExpired')(`
        Current bet end time: %s
        Current time: %s
        Is locked: %s
        Is bet expired: %s`, currentBet.end, new Date().getTime(), currentBet.locked, isExpired)
      if (isExpired) {
        currentBet.locked = true
        currentBet.count = 0
        _.each(currentBet.bets, function (bet) { currentBet.count += _.size(bet) })
        if (currentBet.count > 0) {
          global.commons.sendMessage(global.translate('bets.locked'), {username: global.commons.getOwner()})
          const _id = currentBet._id.toString(); delete currentBet._id
          debug('bets:checkIfBetExpired')('Doing cache %s update \n %o', _id, currentBet)
          let update = await global.db.engine.update('cache', { _id: _id }, currentBet)
          debug('bets:checkIfBetExpired')('Updated Object \n %o', update)
        } else {
          global.commons.sendMessage(global.translate('bets.removed'), global.commons.getOwner())
          if (!_.isEmpty(currentBet)) await global.db.engine.remove('cache', { _id: currentBet._id.toString() })
        }
        await global.db.engine.update('cache', { key: 'betsModifiedTime' }, { value: new Date().getTime() })
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_RUNNING:
          debug('bets:checkIfBetExpired')('No bet is currently running')
          break
        default:
          global.log.error(e.stack)
          break
      }
    }
    setTimeout(() => this.checkIfBetExpired(), 10000)
  }

  commands () {
    const isEnabled = global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled('bets')
    return !isEnabled
      ? []
      : [
        {this: this, command: '!bet open', fnc: this.open, permission: constants.MODS},
        {this: this, command: '!bet close', fnc: this.close, permission: constants.MODS},
        {this: this, command: '!bet refund', fnc: this.refundAll, permission: constants.MODS},
        {this: this, command: '!bet', fnc: this.save, permission: constants.VIEWERS, isHelper: true}
      ]
  }

  async open (self, sender, text) {
    let currentBet = await global.db.engine.findOne('cache', { key: 'bets' })
    try {
      var parsed = text.match(/([\S]+)/g)
      if (parsed.length < 2) { throw new Error(ERROR_NOT_ENOUGH_OPTIONS) }
      if (!_.isEmpty(currentBet)) { throw new Error(ERROR_ALREADY_OPENED) }

      let bet = {locked: false, bets: {}}
      _.each(parsed, function (option) { bet.bets[option] = {} })
      global.commons.sendMessage(global.translate('bets.opened', {username: global.commons.getOwner()})
        .replace(/\$options/g, Object.keys(bet.bets).join(' | '))
        .replace(/\$minutes/g, await global.configuration.getValue('betCloseTimer')), sender)

      bet.key = 'bets'
      bet.end = new Date().getTime() + (parseInt(await global.configuration.getValue('betCloseTimer'), 10) * 1000 * 60)
      global.db.engine.insert('cache', bet)
      // TODO: self.saveTemplate(self, Object.keys(self.bet.bets))
    } catch (e) {
      switch (e.message) {
        case ERROR_ALREADY_OPENED:
          global.commons.sendMessage(global.translate('bets.running').replace(/\$options/g, Object.keys(currentBet.bets).join(' | ')), sender)
          break
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('bets.notEnoughOptions'), sender)
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), sender)
      }
    } finally {
      global.db.engine.update('cache', { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  async info (self, sender) {
    let currentBet = await global.db.engine.findOne('cache', { key: 'bets' })
    if (_.isEmpty(currentBet)) global.commons.sendMessage(global.translate('bets.notRunning'), sender)
    else {
      global.commons.sendMessage(global.translate(currentBet.locked ? 'bets.lockedInfo' : 'bets.info')
        .replace(/\$options/g, Object.keys(currentBet.bets).join(' | '))
        .replace(/\$time/g, parseFloat((currentBet.end - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
    }
  }

  async saveBet (self, sender, text) {
    let currentBet = await global.db.engine.findOne('cache', { key: 'bets' })

    try {
      var parsed = text.match(/^([\S]+) (\d+|all+)$/)
      if (parsed.length < 2) { throw new Error(ERROR_NOT_ENOUGH_OPTIONS) }

      const user = await global.users.get(sender.username)
      let bet = { option: parsed[1], amount: parsed[2] === 'all' && !_.isNil(user.points) ? user.points : parsed[2] }

      if (parseInt(bet.amount, 10) === 0) throw Error(ERROR_ZERO_BET)
      if (_.isEmpty(currentBet)) throw Error(ERROR_NOT_RUNNING)
      if (_.isUndefined(currentBet.bets[bet.option])) throw Error(ERROR_UNDEFINED_BET)
      if (currentBet.locked) throw Error(ERROR_IS_LOCKED)
      if (!_.isUndefined(_.find(currentBet.bets, function (o, i) { return _.includes(Object.keys(o), sender.username) && i !== bet.option }))) throw Error(ERROR_DIFF_BET)

      var percentGain = (Object.keys(currentBet.bets).length * parseInt(await global.configuration.getValue('betPercentGain'), 10)) / 100

      var availablePts = parseInt(user.points, 10)
      var removePts = parseInt(bet.amount, 10)
      if (!_.isFinite(availablePts) || !_.isNumber(availablePts) || availablePts < removePts) {
        global.commons.sendMessage(global.translate('bets.notEnoughPoints')
          .replace(/\$amount/g, removePts)
          .replace(/\$pointsName/g, await Points.getPointsName(removePts)), sender)
      } else {
        var newBet = _.isUndefined(currentBet.bets[bet.option][sender.username]) ? removePts : parseInt(currentBet.bets[bet.option][sender.username], 10) + removePts
        currentBet.bets[bet.option][sender.username] = newBet
        global.db.engine.increment('users', { username: sender.username }, { points: parseInt(removePts, 10) * -1 })

        global.commons.sendMessage(global.translate('bets.newBet')
          .replace(/\$option/g, bet.option)
          .replace(/\$amount/g, newBet)
          .replace(/\$pointsName/g, await Points.getPointsName(newBet))
          .replace(/\$winAmount/g, Math.round((parseInt(newBet, 10) * percentGain)))
          .replace(/\$winPointsName/g, await Points.getPointsName(Math.round((parseInt(newBet, 10) * percentGain)))), sender)

        const _id = currentBet._id.toString(); delete currentBet._id
        await global.db.engine.update('cache', { _id: _id }, currentBet)
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('bets.notEnoughOptions'), sender)
          break
        case ERROR_ZERO_BET:
          global.commons.sendMessage(global.translate('bets.zeroBet')
            .replace(/\$pointsName/g, await Points.getPointsName(0)), sender)
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
          let result = _.pickBy(currentBet.bets, function (v, k) { return _.includes(Object.keys(v), sender.username) })
          global.commons.sendMessage(global.translate('bets.diffBet').replace(/\$option/g, Object.keys(result)[0]), sender)
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), sender)
      }
    }
  }

  async refundAll (self, sender) {
    let currentBet = await global.db.engine.findOne('cache', { key: 'bets' })
    try {
      if (_.isEmpty(currentBet)) throw Error(ERROR_NOT_RUNNING)
      _.each(currentBet.bets, function (users) {
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
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), sender)
      }
    } finally {
      if (!_.isEmpty(currentBet)) await global.db.engine.remove('cache', { _id: currentBet._id.toString() })
      global.db.engine.update('cache', { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  async close (self, sender, text) {
    let currentBet = await global.db.engine.findOne('cache', { key: 'bets' })
    try {
      var wOption = text.match(/^([\S]+)$/)
      var usersToPay = []

      if (_.isNil(wOption)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)
      else wOption = wOption[1]
      if (_.isEmpty(currentBet)) throw Error(ERROR_NOT_RUNNING)
      if (_.isNil(currentBet.bets[wOption])) throw Error(ERROR_NOT_OPTION)

      var percentGain = (Object.keys(currentBet.bets).length * parseInt(await global.configuration.getValue('betPercentGain'), 10)) / 100
      _.each(currentBet.bets[wOption], function (bet, buser) {
        usersToPay.push(buser)
        global.db.engine.increment('users', { username: buser }, { points: parseInt(bet, 10) + Math.round((parseInt(bet, 10) * percentGain)) })
      })

      global.commons.sendMessage(global.translate('bets.closed')
        .replace(/\$option/g, wOption)
        .replace(/\$amount/g, usersToPay.length), sender)
      await global.db.engine.remove('cache', { _id: currentBet._id.toString() })
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('bets.notEnoughOptions'), sender)
          break
        case ERROR_NOT_RUNNING:
          global.commons.sendMessage(global.translate('bets.notRunning'), sender)
          break
        case ERROR_NOT_OPTION:
          global.commons.sendMessage(global.translate('bets.notOption'), sender)
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), sender)
      }
    } finally {
      global.db.engine.update('cache', { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  save (self, sender, text) {
    if (text.length === 0) self.info(self, sender)
    else self.saveBet(self, sender, text)
  }
}

module.exports = new Bets()
