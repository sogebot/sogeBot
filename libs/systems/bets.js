'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')
const cluster = require('cluster')

// bot libraries
var constants = require('../constants')
var Points = require('./points')
const Expects = require('../expects.js')

const ERROR_NOT_ENOUGH_OPTIONS = 'Expected more parameters'
const ERROR_ALREADY_OPENED = '1'
const ERROR_ZERO_BET = '2'
const ERROR_NOT_RUNNING = '3'
const ERROR_UNDEFINED_BET = '4'
const ERROR_IS_LOCKED = '5'
const ERROR_DIFF_BET = '6'
const ERROR_NOT_OPTION = '7'

/*
 * !bet                                                                          - gets an info about bet
 * !bet [option-index] [amount]                                                  - bet [amount] of points on [option]
 * !bet open [-timeout 5] -title "your bet title" option | option | option | ... - open a new bet with selected options
 *                                                                               - -timeout in minutes - optional: default 2
 *                                                                               - -title - must be in "" - optional
 * !bet close [option]                                                           - close a bet and select option as winner
 * !bet refund                                                                   - close a bet and refund all participants
 * !set betPercentGain [0-100]                                                   - sets amount of gain per option
 */

class Bets {
  constructor () {
    if (global.commons.isSystemEnabled('points') && global.commons.isSystemEnabled(this)) {
      global.configuration.register('betPercentGain', 'bets.betPercentGain', 'number', 20)

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

        const _bets = await global.db.engine.find('bets.users')
        if (_bets.length > 0) {
          global.commons.sendMessage(global.translate('bets.locked'), {username: global.commons.getOwner()})
          const _id = currentBet._id.toString(); delete currentBet._id
          debug('bets:checkIfBetExpired')('Doing cache %s update \n %o', _id, currentBet)
          let update = await global.db.engine.update('cache', { _id: _id }, currentBet)
          debug('bets:checkIfBetExpired')('Updated Object \n %o', update)
        } else {
          global.commons.sendMessage(global.translate('bets.removed'), global.commons.getOwner())
          await global.db.engine.remove('cache', { key: 'bets' })
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
    const expects = new Expects()
    const currentBet = await global.db.engine.findOne('cache', { key: 'bets' })

    try {
      if (!_.isEmpty(currentBet)) { throw new Error(ERROR_ALREADY_OPENED) }

      let [minutes, title, options] = expects
        .check(text)
        .argument({ name: 'timeout', optional: true, default: 2 })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray()
      if (options.length < 2) throw new Error(ERROR_NOT_ENOUGH_OPTIONS)

      let bet = { title, locked: false, options: [], key: 'bets', end: new Date().getTime() + minutes * 1000 * 60 }
      for (let i in options) bet.options[i] = { name: options[i] }

      await global.db.engine.insert('cache', bet)
      global.commons.sendMessage(global.translate('bets.opened', {username: global.commons.getOwner()})
        .replace(/\$title/g, title)
        .replace(/\$maxIndex/g, options.length - 1)
        .replace(/\$minutes/g, minutes), sender)
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('bets.notEnoughOptions'), sender)
          break
        case ERROR_ALREADY_OPENED:
          global.commons.sendMessage(global.translate('bets.running').replace(/\$maxIndex/g, currentBet.options.length - 1), sender)
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
        .replace(/\$title/g, currentBet.title)
        .replace(/\$maxIndex/g, currentBet.options.length - 1)
        .replace(/\$minutes/g, parseFloat((currentBet.end - new Date().getTime()) / 1000 / 60).toFixed(1)), sender)
    }
  }

  async participate (self, sender, text) {
    const expects = new Expects()
    const currentBet = await global.db.engine.findOne('cache', { key: 'bets' })

    try {
      let [index, points] = expects.check(text).number({ optional: true }).points({ optional: true }).toArray()
      if (!_.isNil(points) && !_.isNil(index)) {
        const pointsOfUser = await global.systems.points.getPointsOf(sender.username)
        const _betOfUser = await global.db.engine.findOne('bets.users', { username: sender.username })

        if (points === 'all' || points > pointsOfUser) points = pointsOfUser

        if (points === 0) throw Error(ERROR_ZERO_BET)
        if (_.isEmpty(currentBet)) throw Error(ERROR_NOT_RUNNING)
        if (_.isNil(currentBet.options[index])) throw Error(ERROR_UNDEFINED_BET)
        if (currentBet.locked) throw Error(ERROR_IS_LOCKED)
        if (!_.isEmpty(_betOfUser) && _betOfUser.option !== index) throw Error(ERROR_DIFF_BET)

        if (_.isEmpty(_betOfUser)) _betOfUser.points = 0

        // All OK
        await global.db.engine.insert('users.points', { username: sender.username, points: points * -1 })
        await global.db.engine.update('bets.users', { username: sender.username }, { points: points + _betOfUser.points, option: index })
      } else {
        self.info(self, sender)
      }
    } catch (e) {
      switch (e.message) {
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
    } finally {
      global.db.engine.update('cache', { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  async refundAll (self, sender) {
    try {
      if (_.isEmpty(await global.db.engine.findOne('cache', { key: 'bets' }))) throw Error(ERROR_NOT_RUNNING)
      for (let user of await global.db.engine.find('bets.users')) {
        await global.db.engine.insert('users.points', { username: user.username, points: parseInt(user.points, 10) })
      }
      await global.db.engine.remove('bets.users', {})
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
      await global.db.engine.remove('cache', { key: 'bets' })
      global.db.engine.update('cache', { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  async close (self, sender, text) {
    console.log(text)
    const expects = new Expects()
    let currentBet = await global.db.engine.findOne('cache', { key: 'bets' })
    try {
      let index = expects.check(text).number().toArray()[0]

      if (_.isEmpty(currentBet)) throw Error(ERROR_NOT_RUNNING)
      if (_.isNil(currentBet.options[index])) throw Error(ERROR_NOT_OPTION)

      var percentGain = (currentBet.options.length * parseInt(await global.configuration.getValue('betPercentGain'), 10)) / 100

      const users = await global.db.engine.find('bets.users')
      for (let user of users) {
        await global.db.engine.remove('bets.users', { _id: String(user._id) })
        if (user.option === index) await global.db.engine.insert('users.points', { username: user.username, points: parseInt(user.points, 10) + Math.round((parseInt(user.points, 10) * percentGain)) })
      }

      global.commons.sendMessage(global.translate('bets.closed')
        .replace(/\$option/g, currentBet.options[index].name)
        .replace(/\$amount/g, users.length), sender)
      await global.db.engine.remove('cache', { _id: currentBet._id.toString() })
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('bets.closeNotEnoughOptions'), sender)
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
    else self.participate(self, sender, text)
  }
}

module.exports = new Bets()
