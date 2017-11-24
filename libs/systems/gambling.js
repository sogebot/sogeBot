'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')
const config = require('../../config.json')
const debug = require('debug')('systems:gambling')

const ERROR_NOT_ENOUGH_OPTIONS = '0'
const ERROR_ZERO_BET = '1'
const ERROR_NOT_ENOUGH_POINTS = '2'

/*
 * !gamble [amount] - gamble [amount] points with 50/50 chance
 * !seppuku         - timeout yourself
 * !roulette        - 50/50 chance to timeout yourself
 * !duel [points]   - start or participate in duel
 */

function Gambling () {
  if (global.commons.isSystemEnabled(this)) {
    this.current = {
      fightme: {},
      duel: {
        '_total': 0,
        '_timestamp': null
      }
    }

    this.cooldown = {
      'duel': new Date().getTime(),
      'fightme': new Date().getTime()
    }

    if (global.commons.isSystemEnabled('points')) {
      global.parser.register(this, '!gamble', this.gamble, constants.VIEWERS)
      global.parser.register(this, '!duel', this.duel, constants.VIEWERS)
    }

    global.parser.register(this, '!seppuku', this.seppuku, constants.VIEWERS)
    global.parser.register(this, '!roulette', this.roulette, constants.VIEWERS)
    global.parser.register(this, '!fightme', this.fightme, constants.VIEWERS)

    global.configuration.register('seppukuTimeout', 'gambling.seppuku.timeout', 'number', 10)
    global.configuration.register('rouletteTimeout', 'gambling.roulette.timeout', 'number', 10)
    global.configuration.register('fightmeTimeout', 'gambling.fightme.timeout', 'number', 10)

    global.configuration.register('gamblingCooldownBypass', 'gambling.cooldown.bypass', 'bool', false)
    global.configuration.register('duelCooldown', 'gambling.cooldown.duel', 'number', 0)
    global.configuration.register('fightmeCooldown', 'gambling.cooldown.fightme', 'number', 0)

    const self = this
    setInterval(async function () {
      if (_.isNil(self.current.duel._timestamp)) return true

      if (new Date().getTime() - self.current.duel._timestamp > 1000 * 60 * 5) {
        let winner = _.random(0, parseInt(self.current.duel._total, 10) - 1, false)
        const total = self.current.duel._total

        delete self.current.duel._total
        delete self.current.duel._timestamp

        let winnerArray = []
        _.each(self.current.duel, function (v, k) {
          for (let i = 0; i < v; i++) {
            winnerArray.push(k)
          }
        })

        const username = winnerArray[winner]
        const tickets = parseInt(self.current.duel[username], 10)
        const probability = tickets / (parseInt(total, 10) / 100)

        let m = global.commons.prepare(_.size(self.current.duel) === 1 ? 'gambling.duel.noContestant' : 'gambling.duel.winner', {
          pointsName: global.systems.points.getPointsName(total),
          points: total,
          probability: _.round(probability, 2),
          ticketsName: global.systems.points.getPointsName(tickets),
          tickets: tickets,
          winner: username
        })
        debug(m); global.commons.sendMessage(m, { username: username }, { force: true })

        // give user his points
        global.db.engine.incrementOne('users', { username: username }, { points: parseInt(total, 10) })

        // reset duel
        self.current.duel = {}
        self.current.duel._timestamp = null
        self.current.duel._total = 0
      }
    }, 30000)
  }
}

Gambling.prototype.duel = async function (self, sender, text) {
  sender['message-type'] = 'chat' // force responses to chat
  let points = 0
  try {
    let parsed = text.trim().match(/^([\d]+)$/)
    if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

    points = parsed[1]
    if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)

    const user = await global.users.get(sender.username)
    if (_.isNil(user.points) || user.points < points) throw Error(ERROR_NOT_ENOUGH_POINTS)
    global.db.engine.incrementOne('users', { username: sender.username }, { points: parseInt(points, 10) * -1 })

    // check if user is already in duel and add points
    let newDuelist = true
    _.each(self.current.duel, function (value, key) {
      if (key === '_total' || key === '_timestamp') return true
      if (key.toLowerCase() === sender.username.toLowerCase()) {
        self.current.duel[key] = parseInt(self.current.duel[key], 10) + parseInt(points, 10)
        newDuelist = false
        return false
      }
    })
    if (newDuelist) {
      // check if under gambling cooldown
      const cooldown = global.configuration.getValue('duelCooldown')
      const isMod = await global.parser.isMod(sender)
      if (new Date().getTime() - self.cooldown.duel > cooldown * 1000 ||
        (global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.parser.isBroadcaster(sender)))) {
        // save new cooldown if not bypassed
        if (!(global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.parser.isBroadcaster(sender)))) self.cooldown.duel = new Date().getTime()
        self.current.duel[sender.username.toLowerCase()] = parseInt(points, 10)
      } else {
        global.commons.sendMessage(global.translate('gambling.fightme.cooldown')
          .replace(/\$cooldown/g, Math.round(((cooldown * 1000) - (new Date().getTime() - self.cooldown.duel)) / 1000 / 60))
          .replace(/\$minutesName/g, global.parser.getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - self.cooldown.duel)) / 1000 / 60), 'core.minutes')), sender)
        return true
      }
    }

    // if new duel, we want to save timestamp
    if (_.isNil(self.current.duel._timestamp)) {
      self.current.duel._timestamp = new Date().getTime()
      let message = global.commons.prepare('gambling.duel.new', { minutesName: global.parser.getLocalizedName(5, 'core.minutes'), minutes: 5 })
      debug(message); global.commons.sendMessage(message, sender)
    }

    // save points to _total
    self.current.duel._total = parseInt(self.current.duel._total, 10) + parseInt(points, 10)

    global.commons.sendMessage(global.translate(newDuelist ? 'gambling.duel.joined' : 'gambling.duel.added')
      .replace(/\$pointsName/g, global.systems.points.getPointsName(self.current.duel[sender.username.toLowerCase()]))
      .replace(/\$points/g, self.current.duel[sender.username.toLowerCase()]), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_NOT_ENOUGH_OPTIONS:
        global.commons.sendMessage(global.translate('gambling.duel.notEnoughOptions'), sender)
        break
      case ERROR_ZERO_BET:
        global.commons.sendMessage(global.translate('gambling.duel.zeroBet')
        .replace(/\$pointsName/g, global.systems.points.getPointsName(0)), sender)
        break
      case ERROR_NOT_ENOUGH_POINTS:
        global.commons.sendMessage(global.translate('gambling.duel.notEnoughPoints')
        .replace(/\$pointsName/g, global.systems.points.getPointsName(points).toLowerCase()), sender)
        break
    }
  }
}

Gambling.prototype.roulette = async function (self, sender) {
  sender['message-type'] = 'chat' // force responses to chat

  let isAlive = _.random(0, 1, false)
  let message = [
    global.translate('gambling.roulette.trigger'),
    isAlive ? global.translate('gambling.roulette.alive') : global.translate('gambling.roulette.dead')
  ]
  const isMod = await global.parser.isMod(sender)

  if (global.parser.isBroadcaster(sender)) {
    global.commons.sendMessage(global.translate('gambling.roulette.trigger') + ' ' + global.translate('gambling.roulette.broadcaster'), sender)
    return
  }

  if (isMod) {
    global.commons.sendMessage(global.translate('gambling.roulette.trigger') + ' ' + global.translate('gambling.roulette.mod'), sender)
    return
  }

  if (!isAlive) global.client.timeout(config.settings.broadcaster_username, sender.username, global.configuration.getValue('rouletteTimeout'))
  global.commons.sendMessage(message.join(' '), sender)
}

Gambling.prototype.seppuku = async function (self, sender) {
  if (global.parser.isBroadcaster(sender)) {
    global.commons.sendMessage(global.translate('gambling.seppuku.broadcaster'), sender)
    return
  }

  const isMod = await global.parser.isMod(sender)
  if (isMod) {
    global.commons.sendMessage(global.translate('gambling.seppuku.mod'), sender)
    return
  }

  global.commons.sendMessage(global.translate('gambling.seppuku.text'), sender)
  global.client.timeout(config.settings.broadcaster_username, sender.username, global.configuration.getValue('seppukuTimeout'))
}

Gambling.prototype.fightme = async function (self, sender, text) {
  sender['message-type'] = 'chat' // force responses to chat
  var username

  try {
    username = text.trim().match(/^@?([\S]+)$/)[1].toLowerCase()
    sender.username = sender.username.toLowerCase()
  } catch (e) {
    global.commons.sendMessage(global.translate('gambling.fightme.notEnoughOptions'), sender) // TODO
    return
  }

  // check if you are challenged by user
  if (_.includes(self.current.fightme[username], sender.username)) {
    let winner = _.random(0, 1, false)
    let isMod = {
      user: await global.parser.isMod(username),
      sender: await global.parser.isMod(sender)
    }

    // vs broadcaster
    if (global.parser.isBroadcaster(sender) || global.parser.isBroadcaster(username)) {
      debug('vs broadcaster')
      global.commons.sendMessage(global.translate('gambling.fightme.broadcaster')
        .replace(/\$winner/g, global.parser.isBroadcaster(sender) ? sender.username : username), sender)
      isMod = global.parser.isBroadcaster(sender) ? isMod.user : isMod.sender
      if (!isMod) global.client.timeout(config.settings.broadcaster_username, global.parser.isBroadcaster(sender) ? username : sender.username, global.configuration.getValue('fightmeTimeout'))
      self.current.fightme[username] = _.pull(self.current.fightme[username], sender.username)
      return
    }

    // mod vs mod
    if (isMod.user && isMod.sender) {
      debug('mod vs mod')
      global.commons.sendMessage(global.translate('gambling.fightme.bothModerators')
        .replace(/\$challenger/g, username), sender)
      self.current.fightme[username] = _.pull(self.current.fightme[username], sender.username)
      return
    }

    // vs mod
    if (isMod.user || isMod.sender) {
      debug('vs mod')
      global.commons.sendMessage(global.translate('gambling.fightme.oneModerator')
        .replace(/\$winner/g, isMod.sender ? sender.username : username), sender)
      global.client.timeout(config.settings.broadcaster_username, isMod.sender ? username : sender.username, global.configuration.getValue('fightmeTimeout'))
      self.current.fightme[username] = _.pull(self.current.fightme[username], sender.username)
      return
    }

    debug('user vs user')
    global.client.timeout(config.settings.broadcaster_username, winner ? sender.username : username, global.configuration.getValue('fightmeTimeout'))
    global.commons.sendMessage(global.translate('gambling.fightme.winner')
      .replace(/\$winner/g, winner ? username : sender.username), sender)
    self.current.fightme[username] = _.pull(self.current.fightme[username], sender.username)
  } else {
    // check if under gambling cooldown
    const cooldown = global.configuration.getValue('fightmeCooldown')
    const isMod = await global.parser.isMod(sender)
    if (new Date().getTime() - self.cooldown.fightme < cooldown * 1000 &&
      !(global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.parser.isBroadcaster(sender)))) {
      global.commons.sendMessage(global.translate('gambling.fightme.cooldown')
        .replace(/\$cooldown/g, Math.round(((cooldown * 1000) - (new Date().getTime() - self.cooldown.fightme)) / 1000 / 60))
        .replace(/\$minutesName/g, global.parser.getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - self.cooldown.fightme)) / 1000 / 60), 'core.minutes')), sender)
      return
    }

    // save new timestamp if not bypassed
    if (!(global.configuration.getValue('gamblingCooldownBypass') && (isMod || global.parser.isBroadcaster(sender)))) self.cooldown.fightme = new Date().getTime()

    if (_.isNil(self.current.fightme[sender.username])) self.current.fightme[sender.username] = []

    self.current.fightme[sender.username].push(username)
    self.current.fightme[sender.username] = _.uniq(self.current.fightme[sender.username])
    global.commons.sendMessage(global.translate('gambling.fightme.challenge')
      .replace(/\$username/g, username), sender)
  }
}

Gambling.prototype.gamble = async function (self, sender, text) {
  sender['message-type'] = 'chat' // force responses to chat
  let points = 0
  try {
    let parsed = text.trim().match(/^([\d]+)$/)
    if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

    points = parsed[1]
    if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)

    const user = await global.users.get(sender.username)
    if (_.isNil(user.points) || user.points < points) throw Error(ERROR_NOT_ENOUGH_POINTS)

    await global.db.engine.incrementOne('users', { username: sender.username }, { points: parseInt(points, 10) * -1 })
    if (_.random(0, 1)) {
      let updatedUser = await global.db.engine.incrementOne('users', { username: sender.username }, { points: parseInt(points, 10) * 2 })
      global.commons.sendMessage(global.translate('gambling.gamble.win')
        .replace(/\$pointsName/g, global.systems.points.getPointsName(updatedUser.points))
        .replace(/\$points/g, (parseInt(updatedUser.points, 10)))
        , sender)
    } else {
      global.commons.sendMessage(global.translate('gambling.gamble.lose')
        .replace(/\$pointsName/g, global.systems.points.getPointsName(user.points))
        .replace(/\$points/g, parseInt(user.points, 10) - parseInt(points, 10))
        , sender)
    }
  } catch (e) {
    switch (e.message) {
      case ERROR_ZERO_BET:
        global.commons.sendMessage(global.translate('gambling.gamble.zeroBet')
        .replace(/\$pointsName/g, global.systems.points.getPointsName(0)), sender)
        break
      case ERROR_NOT_ENOUGH_OPTIONS:
        global.commons.sendMessage(global.translate('gambling.gamble.notEnoughOptions'), sender)
        break
      case ERROR_NOT_ENOUGH_POINTS:
        global.commons.sendMessage(global.translate('gambling.gamble.notEnoughPoints')
        .replace(/\$pointsName/g, global.systems.points.getPointsName(points).toLowerCase()), sender)
        break
      default:
        global.log.error(e.stack)
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  }
}

module.exports = new Gambling()
