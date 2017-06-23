'use strict'

// 3rdparty libraries
var _ = require('lodash')

// bot libraries
var constants = require('../constants')

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
  if (global.commons.isSystemEnabled(this) && global.commons.isSystemEnabled('points')) {
    this.current = {
      duel: {
        '_total': 0,
        '_timestamp': null
      }
    }

    global.parser.register(this, '!gamble', this.gamble, constants.VIEWERS)
    global.parser.register(this, '!seppuku', this.seppuku, constants.VIEWERS)
    global.parser.register(this, '!roulette', this.roulette, constants.VIEWERS)
    global.parser.register(this, '!duel', this.duel, constants.VIEWERS)

    global.configuration.register('seppukuTimeout', 'gambling.seppuku.timeout', 'number', 10)
    global.configuration.register('rouletteTimeout', 'gambling.roulette.timeout', 'number', 10)

    const self = this
    setInterval(function () {
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

        global.commons.sendMessage(global.translate((_.size(self.current.duel) === 1) ? 'gambling.duel.noContestant' : 'gambling.duel.winner')
          .replace('(pointsName)', global.systems.points.getPointsName(total))
          .replace('(points)', total)
          .replace('(probability)', _.round(probability, 2))
          .replace('(tickets)', tickets)
          .replace('(ticketsName)', global.systems.points.getPointsName(tickets))
          .replace('(winner)', (global.configuration.getValue('atUsername') ? '@' : '') + username), { username: username }, { force: true })

        // give user his points
        const user = global.users.get(username)
        user.points = parseInt(_.isNil(user.points) ? 0 : user.points, 10) + parseInt(total, 10)
        global.users.set(username, { points: user.points })

        // reset duel
        self.current.duel = {}
        self.current.duel._timestamp = null
        self.current.duel._total = 0
      }
    }, 30000)
  }
}

Gambling.prototype.duel = function (self, sender, text) {
  sender['message-type'] = 'chat' // force responses to chat
  let points = 0
  try {
    let parsed = text.trim().match(/^([\d]+)$/)
    if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

    points = parsed[1]
    if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)

    const user = global.users.get(sender.username)
    if (_.isNil(user.points) || user.points < points) throw Error(ERROR_NOT_ENOUGH_POINTS)
    global.users.set(sender.username, { points: parseInt(user.points, 10) - parseInt(points, 10) })

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
    if (newDuelist) self.current.duel[sender.username.toLowerCase()] = parseInt(points, 10)

    // if new duel, we want to save timestamp
    if (_.isNil(self.current.duel._timestamp)) {
      self.current.duel._timestamp = new Date().getTime()
      global.commons.sendMessage(global.translate('gambling.duel.new')
        .replace('(minutes)', 5)
        .replace('(minutesName)', global.parser.getLocalizedName(5, 'core.minutes')), sender)
    }

    // save points to _total
    self.current.duel._total = parseInt(self.current.duel._total, 10) + parseInt(points, 10)

    global.commons.sendMessage(global.translate(newDuelist ? 'gambling.duel.joined' : 'gambling.duel.added')
      .replace('(pointsName)', global.systems.points.getPointsName(self.current.duel[sender.username.toLowerCase()]))
      .replace('(points)', self.current.duel[sender.username.toLowerCase()]), sender)
  } catch (e) {
    switch (e.message) {
      case ERROR_NOT_ENOUGH_OPTIONS:
        global.commons.sendMessage(global.translate('gambling.duel.notEnoughOptions'), sender)
        break
      case ERROR_ZERO_BET:
        global.commons.sendMessage(global.translate('gambling.duel.zeroBet')
        .replace('(pointsName)', global.systems.points.getPointsName(0)), sender)
        break
      case ERROR_NOT_ENOUGH_POINTS:
        global.commons.sendMessage(global.translate('gambling.duel.notEnoughPoints')
        .replace('(pointsName)', global.systems.points.getPointsName(points).toLowerCase()), sender)
        break
    }
  }
}

Gambling.prototype.roulette = function (self, sender) {
  sender['message-type'] = 'chat' // force responses to chat
  let isAlive = _.random(0, 1, false)
  let message = [
    global.translate('gambling.roulette.trigger'),
    isAlive ? global.translate('gambling.roulette.alive') : global.translate('gambling.roulette.dead')
  ]
  if (!isAlive) global.client.timeout(global.configuration.get().twitch.channel, sender.username, global.configuration.getValue('rouletteTimeout'))
  global.commons.sendMessage(message.join(' '), sender)
}

Gambling.prototype.seppuku = function (self, sender) {
  global.commons.sendMessage(global.translate('gambling.seppuku.text'), sender)
  global.client.timeout(global.configuration.get().twitch.channel, sender.username, global.configuration.getValue('seppukuTimeout'))
}

Gambling.prototype.gamble = function (self, sender, text) {
  sender['message-type'] = 'chat' // force responses to chat
  let points = 0
  try {
    let parsed = text.trim().match(/^([\d]+)$/)
    if (_.isNil(parsed)) throw Error(ERROR_NOT_ENOUGH_OPTIONS)

    points = parsed[1]
    if (parseInt(points, 10) === 0) throw Error(ERROR_ZERO_BET)

    const user = global.users.get(sender.username)
    if (_.isNil(user.points) || user.points < points) throw Error(ERROR_NOT_ENOUGH_POINTS)

    global.users.set(sender.username, { points: parseInt(user.points, 10) - parseInt(points, 10) })
    if (_.random(0, 1)) {
      global.users.set(sender.username, { points: parseInt(user.points, 10) + (parseInt(points, 10) * 2) })
      global.commons.sendMessage(global.translate('gambling.gamble.win')
        .replace('(points)', global.users.get(sender.username).points)
        .replace('(pointsName)', global.systems.points.getPointsName(global.users.get(sender.username).points)), sender)
    } else {
      global.commons.sendMessage(global.translate('gambling.gamble.lose')
        .replace('(points)', global.users.get(sender.username).points)
        .replace('(pointsName)', global.systems.points.getPointsName(global.users.get(sender.username).points)), sender)
    }
  } catch (e) {
    switch (e.message) {
      case ERROR_ZERO_BET:
        global.commons.sendMessage(global.translate('gambling.gamble.zeroBet')
        .replace('(pointsName)', global.systems.points.getPointsName(0)), sender)
        break
      case ERROR_NOT_ENOUGH_OPTIONS:
        global.commons.sendMessage(global.translate('gambling.gamble.notEnoughOptions'), sender)
        break
      case ERROR_NOT_ENOUGH_POINTS:
        global.commons.sendMessage(global.translate('gambling.gamble.notEnoughPoints')
        .replace('(pointsName)', global.systems.points.getPointsName(points).toLowerCase()), sender)
        break
      default:
        global.commons.sendMessage(global.translate('core.error'), sender)
    }
  }
}

module.exports = new Gambling()
