'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')
const cluster = require('cluster')

// bot libraries
var constants = require('../constants')
var Points = require('./points')
const Expects = require('../expects.js')
const Timeout = require('../timeout')
const System = require('./_interface')

const ERROR_NOT_ENOUGH_OPTIONS = 'Expected more parameters'
const ERROR_ALREADY_OPENED = '1'
const ERROR_ZERO_BET = '2'
const ERROR_NOT_RUNNING = '3'
const ERROR_UNDEFINED_BET = '4'
const ERROR_IS_LOCKED = '5'
const ERROR_DIFF_BET = '6'
const ERROR_NOT_OPTION = '7'

const DEBUG_BET_CHECK_IF_EXPIRED = debug('bets:checkIfBetExpired')

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

class Bets extends System {
  constructor () {
    const dependsOn = [
      'systems.points'
    ]
    const settings = {
      betPercentGain: 20,
      commands: [
        { name: '!bet open', permission: constants.MODS },
        { name: '!bet close', permission: constants.MODS },
        { name: '!bet refund', permission: constants.MODS },
        { name: '!bet', isHelper: true }
      ]
    }

    super({ settings, dependsOn })

    this.timeouts = {}

    if (cluster.isMaster) {
      this.checkIfBetExpired()
    }
  }

  async checkIfBetExpired () {
    try {
      let currentBet = await global.db.engine.findOne(this.collection.data, { key: 'bets' })
      DEBUG_BET_CHECK_IF_EXPIRED('Current bet object: %o', currentBet)
      if (_.isEmpty(currentBet) || currentBet.locked) throw Error(ERROR_NOT_RUNNING)

      const isExpired = currentBet.end <= new Date().getTime()
      DEBUG_BET_CHECK_IF_EXPIRED(`
        Current bet end time: %s
        Current time: %s
        Is locked: %s
        Is bet expired: %s`, currentBet.end, new Date().getTime(), currentBet.locked, isExpired)
      if (isExpired) {
        currentBet.locked = true

        const _bets = await global.db.engine.find(this.collection.users)
        if (_bets.length > 0) {
          global.commons.sendMessage(global.translate('bets.locked'), { username: global.commons.getOwner() })
          const _id = currentBet._id.toString(); delete currentBet._id
          DEBUG_BET_CHECK_IF_EXPIRED('Doing cache %s update \n %o', _id, currentBet)
          let update = await global.db.engine.update(this.collection.data, { _id: _id }, currentBet)
          DEBUG_BET_CHECK_IF_EXPIRED('Updated Object \n %o', update)
        } else {
          global.commons.sendMessage(global.translate('bets.removed'), global.commons.getOwner())
          await global.db.engine.remove(this.collection.data, { key: 'bets' })
        }
        await global.db.engine.update(this.collection.data, { key: 'betsModifiedTime' }, { value: new Date().getTime() })
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_RUNNING:
          DEBUG_BET_CHECK_IF_EXPIRED('No bet is currently running')
          break
        default:
          global.log.error(e.stack)
          break
      }
    }
    new Timeout().recursive({ uid: 'betsCheckIfBetExpired', this: this, fnc: this.checkIfBetExpired, wait: 10000 })
  }

  async open (opts) {
    const expects = new Expects()
    const currentBet = await global.db.engine.findOne(this.collection.data, { key: 'bets' })

    try {
      if (!_.isEmpty(currentBet)) { throw new Error(ERROR_ALREADY_OPENED) }

      let [timeout, title, options] = expects
        .check(opts.parameters)
        .argument({ name: 'timeout', optional: true, default: 2, type: Number })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray()
      if (options.length < 2) throw new Error(ERROR_NOT_ENOUGH_OPTIONS)

      let bet = { title, locked: false, options: [], key: 'bets', end: new Date().getTime() + timeout * 1000 * 60 }
      for (let i in options) bet.options[i] = { name: options[i] }

      await global.db.engine.insert(this.collection.data, bet)
      global.commons.sendMessage(await global.commons.prepare('bets.opened', {
        username: global.commons.getOwner(),
        title: title,
        maxIndex: options.length - 1,
        minutes: timeout,
        options: options.map((v, i) => `${i}. '${v}'`).join(', '),
        command: opts.command
      }), opts.sender)
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('bets.notEnoughOptions'), opts.sender)
          break
        case ERROR_ALREADY_OPENED:
          global.commons.sendMessage(await global.commons.prepare('bets.running', {
            command: opts.command,
            $maxIndex: currentBet.options.length - 1,
            $options: currentBet.options.map((v, i) => `${i}. '${v.name}'`).join(', ') }), opts.sender)
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
    } finally {
      global.db.engine.update(this.collection.data, { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  async info (opts) {
    let currentBet = await global.db.engine.findOne(this.collection.data, { key: 'bets' })
    if (_.isEmpty(currentBet)) global.commons.sendMessage(global.translate('bets.notRunning'), opts.sender)
    else {
      global.commons.sendMessage(await global.commons.prepare(currentBet.locked ? 'bets.lockedInfo' : 'bets.info', {
        command: opts.command,
        $title: currentBet.title,
        $maxIndex: currentBet.options.length - 1,
        $options: currentBet.options.map((v, i) => `${i}. '${v.name}'`).join(', '),
        $minutes: parseFloat((currentBet.end - new Date().getTime()) / 1000 / 60).toFixed(1) }), opts.sender)
    }
  }

  async participate (opts) {
    const expects = new Expects()
    const currentBet = await global.db.engine.findOne(this.collection.data, { key: 'bets' })

    try {
      let [index, points] = expects.check(opts.parameters).number({ optional: true }).points({ optional: true }).toArray()
      if (!_.isNil(points) && !_.isNil(index)) {
        const pointsOfUser = await global.systems.points.getPointsOf(opts.sender.username)
        const _betOfUser = await global.db.engine.findOne(this.collection.users, { username: opts.sender.username })

        if (points === 'all' || points > pointsOfUser) points = pointsOfUser

        if (points === 0) throw Error(ERROR_ZERO_BET)
        if (_.isEmpty(currentBet)) throw Error(ERROR_NOT_RUNNING)
        if (_.isNil(currentBet.options[index])) throw Error(ERROR_UNDEFINED_BET)
        if (currentBet.locked) throw Error(ERROR_IS_LOCKED)
        if (!_.isEmpty(_betOfUser) && _betOfUser.option !== index) throw Error(ERROR_DIFF_BET)

        if (_.isEmpty(_betOfUser)) _betOfUser.points = 0

        // All OK
        await global.db.engine.insert('users.points', { username: opts.sender.username, points: points * -1 })
        await global.db.engine.update(this.collection.users, { username: opts.sender.username }, { points: points + _betOfUser.points, option: index })
      } else {
        this.info(opts)
      }
    } catch (e) {
      switch (e.message) {
        case ERROR_ZERO_BET:
          global.commons.sendMessage(global.translate('bets.zeroBet')
            .replace(/\$pointsName/g, await Points.getPointsName(0)), opts.sender)
          break
        case ERROR_NOT_RUNNING:
          global.commons.sendMessage(global.translate('bets.notRunning'), opts.sender)
          break
        case ERROR_UNDEFINED_BET:
          global.commons.sendMessage(await global.commons.prepare('bets.undefinedBet', { command: opts.command }), opts.sender)
          break
        case ERROR_IS_LOCKED:
          global.commons.sendMessage(global.translate('bets.timeUpBet'), opts.sender)
          break
        case ERROR_DIFF_BET:
          let result = _.pickBy(currentBet.bets, function (v, k) { return _.includes(Object.keys(v), opts.sender.username) })
          global.commons.sendMessage(global.translate('bets.diffBet').replace(/\$option/g, Object.keys(result)[0]), opts.sender)
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(await global.commons.prepare('bets.error', { command: opts.command }).replace(/\$maxIndex/g, currentBet.options.length - 1), opts.sender)
      }
    } finally {
      global.db.engine.update(this.collection.data, { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  async refund (opts) {
    try {
      if (_.isEmpty(await global.db.engine.findOne(this.collection.data, { key: 'bets' }))) throw Error(ERROR_NOT_RUNNING)
      for (let user of await global.db.engine.find(this.collection.users)) {
        await global.db.engine.insert('users.points', { username: user.username, points: parseInt(user.points, 10) })
      }
      await global.db.engine.remove(this.collection.users, {})
      global.commons.sendMessage(global.translate('bets.refund'), opts.sender)
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_RUNNING:
          global.commons.sendMessage(global.translate('bets.notRunning'), opts.sender)
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
    } finally {
      await global.db.engine.remove(this.collection.data, { key: 'bets' })
      global.db.engine.update(this.collection.data, { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  async close (opts) {
    const expects = new Expects()
    let currentBet = await global.db.engine.findOne(this.collection.data, { key: 'bets' })
    try {
      let index = expects.check(opts.parameters).number().toArray()[0]

      if (_.isEmpty(currentBet)) throw Error(ERROR_NOT_RUNNING)
      if (_.isNil(currentBet.options[index])) throw Error(ERROR_NOT_OPTION)

      var percentGain = (currentBet.options.length * parseInt(await this.settings.betPercentGain, 10)) / 100

      const users = await global.db.engine.find(this.collection.users)
      let total = 0
      for (let user of users) {
        await global.db.engine.remove(this.collection.users, { _id: String(user._id) })
        if (user.option === index) {
          total += Math.round((parseInt(user.points, 10) * percentGain))
          await global.db.engine.insert('users.points', { username: user.username, points: Math.round((parseInt(user.points, 10) * percentGain)) })
        }
      }

      global.commons.sendMessage(global.translate('bets.closed')
        .replace(/\$option/g, currentBet.options[index].name)
        .replace(/\$amount/g, _.filter(users, (o) => o.option === index).length)
        .replace(/\$pointsName/g, await Points.getPointsName(total))
        .replace(/\$points/g, total), opts.sender)
      await global.db.engine.remove(this.collection.data, { _id: currentBet._id.toString() })
    } catch (e) {
      switch (e.message) {
        case ERROR_NOT_ENOUGH_OPTIONS:
          global.commons.sendMessage(global.translate('bets.closeNotEnoughOptions'), opts.sender)
          break
        case ERROR_NOT_RUNNING:
          global.commons.sendMessage(global.translate('bets.notRunning'), opts.sender)
          break
        case ERROR_NOT_OPTION:
          global.commons.sendMessage(await global.commons.prepare('bets.notOption', { command: opts.command }), opts.sender)
          break
        default:
          global.log.warning(e.stack)
          global.commons.sendMessage(global.translate('core.error'), opts.sender)
      }
    } finally {
      global.db.engine.update(this.collection.data, { key: 'betsModifiedTime' }, { value: new Date().getTime() })
    }
  }

  main (opts) {
    if (opts.parameters.length === 0) this.info(opts)
    else this.participate(opts)
  }
}

module.exports = new Bets()
