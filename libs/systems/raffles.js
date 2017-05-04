'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

/*
 * !raffle                                                      - gets an info about raffle
 * !raffle open [raffle-keyword] [product] [time=#] [followers] - open a new raffle with selected keyword for specified product (optional), time=# (optional) - minimal watched time in minutes, for followers? (optional)
 * !raffle close                                                - close a raffle manually
 * !raffle pick                                                 - pick or repick a winner of raffle
 * ![raffle-keyword]                                            - join a raffle
 * !set raffleAnnounceInterval [minutes]                        - reannounce raffle interval each x minutes
 */

function Raffles () {
  if (global.commons.isSystemEnabled(this)) {
    this.lastAnnounce = 0
    this.keyword = null
    this.product = null
    this.minWatchedTime = 0
    this.followers = false

    global.parser.register(this, '!raffle pick', this.pick, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle close', this.close, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle open', this.open, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle', this.info, constants.VIEWERS)
    global.parser.registerHelper('!raffle')
    global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)
    global.configuration.register('raffleAnnounceCustomMessage', 'raffle.announceCustomMessage', 'string', '')

    var self = this
    setInterval(function () {
      if (new Date().getTime() < self.lastAnnounce + (global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000) || _.isNil(self.keyword)) return
      self.lastAnnounce = new Date().getTime()
      let message
      if (global.configuration.getValue('raffleAnnounceCustomMessage').length > 0) {
        message = global.configuration.getValue('raffleAnnounceCustomMessage')
          .replace('(keyword)', self.keyword)
          .replace('(product)', self.product)
      } else {
        if (self.followers && self.product) {
          message = global.translate('raffle.open.notice.both')
            .replace('(keyword)', self.keyword)
            .replace('(product)', self.product)
        } else if (self.followers && !self.product) {
          message = global.translate('raffle.open.notice.followers')
            .replace('(keyword)', self.keyword)
        } else if (!self.followers && self.product) {
          message = global.translate('raffle.open.notice.product')
            .replace('(keyword)', self.keyword)
            .replace('(product)', self.product)
        }
      }

      if (self.minWatchedTime > 0) {
        message += ' ' + global.translate('raffle.minWatchedTime').replace('(time)', self.minWatchedTime)
      }
      global.commons.sendMessage(message + '.', { username: null }, { force: true })
    }, 10000)

    this.registerRaffleKeyword(this)
  }
}

Raffles.prototype.registerRaffleKeyword = function (self) {
  if (!_.isNull(self.keyword)) global.parser.unregister('!' + self.keyword)
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.registerRaffleKeyword' })
    if (!_.isNull(item)) {
      global.parser.register(this, '!' + item.keyword, self.participate, constants.VIEWERS)
      self.keyword = item.keyword
      self.product = item.product
      self.followers = item.followers
      self.minWatchedTime = item.minWatchedTime
    }
  })
}

Raffles.prototype.pick = function (self, sender) {
  global.botDB.find({ $where: function () { return this._id.startsWith('raffle_participant_') && this.eligible } }, function (err, items) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.pick' })
    var winner = { username: null }
    if (items.length !== 0) {
      winner = _.sample(items)
      global.botDB.update({ _id: winner._id }, { $set: { eligible: false } }) // don't want to pick same winner 2 times
    }

    if (_.isNull(winner.username)) {
      global.commons.sendMessage(global.translate('raffle.pick.noParticipants'), sender)
    } else {
      const user = global.users.get(winner.username)
      global.botDB.update({_id: 'raffle'}, {$set: { winner: user, locked: true, timestamp: new Date().getTime() }})
      global.commons.sendMessage(!_.isNil(self.product) ? global.translate('raffle.pick.winner.withProduct') : global.translate('raffle.pick.winner.withoutProduct')
        .replace('(winner)', winner.username), sender)
      global.parser.unregister('!' + self.keyword)
      global.widgets.raffles.sendWinner(global.widgets.raffles, user)
      clearInterval(self.timer)
    }
  })
}

Raffles.prototype.participate = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.participate' })
    if (!_.isNull(item) && !item.locked) {
      var participant = { _id: 'raffle_participant_' + sender.username,
        eligible: true,
        forced: false,
        username: sender.username }

      const user = global.users.get(sender.username)
      if (item.followers) {
        participant.eligible = _.isUndefined(user.is.follower) ? false : user.is.follower
      }

      if (participant.eligible && item.minWatchedTime > 0) {
        participant.eligible = !_.isUndefined(user.time.watched) && (user.time.watched - 3600000) > 0
      }

      sender['message-type'] = 'whisper'
      if (participant.eligible) {
        global.commons.sendMessage(global.translate('raffle.participation.success'), sender)
        global.botDB.insert(participant)
      } else {
        global.commons.sendMessage(global.translate('raffle.participation.failed'), sender)
      }
    }
  })
}

Raffles.prototype.info = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.info' })
    if (!_.isNull(item)) {
      if (!_.isNull(item.winner)) global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
      else if (!item.locked) {
        let message = global.translate('raffle.info.opened.none').replace('(keyword)', item.keyword)
        if (item.followers && item.product) {
          message = global.translate('raffle.info.opened.both')
            .replace('(keyword)', item.keyword)
            .replace('(product)', item.product)
        } else if (item.followers && !item.product) {
          message = global.translate('raffle.info.opened.followers')
            .replace('(keyword)', item.keyword)
        } else if (!item.followers && item.product) {
          message = global.translate('raffle.info.opened.product')
            .replace('(keyword)', item.keyword)
            .replace('(product)', item.product)
        }

        if (item.minWatchedTime > 0) {
          message += ' ' + global.translate('raffle.minWatchedTime').replace('(time)', item.minWatchedTime)
        }
        global.commons.sendMessage(message + '.', sender)
      } else {
        global.commons.sendMessage(global.translate('raffle.info.closed'), sender)
      }
    } else {
      global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
    }
  })
}

Raffles.prototype.open = function (self, sender, text, dashboard = false) {
  try {
    let followers = false
    if (text.indexOf('followers') >= 0) {
      text = text.replace('followers', '').trim()
      followers = true
    }

    // check if time is set
    let minWatchedTime = 0
    let split = text.split(' ')
    if (split[split.length - 1].startsWith('time=')) {
      minWatchedTime = split[split.length - 1].replace('time=', '')
      split.pop()
      text = split.join(' ')
    }

    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)?/)
    var groups = { keyword: 1, product: 2 }
    var raffle = {
      keyword: parsed[groups.keyword],
      followers: followers,
      product: !_.isNil(parsed[groups.product]) ? parsed[groups.product] : '',
      minWatchedTime: minWatchedTime,
      winner: null,
      locked: false
    }

    global.botDB.update({_id: 'raffle'}, {$set: raffle}, {upsert: true}, function (err) {
      if (err) return log.error(err, { fnc: 'Raffles.prototype.open' })

      let message = global.translate('raffle.open.ok.none').replace('(keyword)', raffle.keyword)
      if (raffle.followers && raffle.product) {
        message = global.translate('raffle.open.ok.both')
          .replace('(keyword)', raffle.keyword)
          .replace('(product)', raffle.product)
      } else if (raffle.followers && !raffle.product) {
        message = global.translate('raffle.open.ok.followers')
          .replace('(keyword)', raffle.keyword)
      } else if (!raffle.followers && raffle.product) {
        message = global.translate('raffle.open.ok.product')
          .replace('(keyword)', raffle.keyword)
          .replace('(product)', raffle.product)
      }

      if (raffle.minWatchedTime > 0) {
        message += ' ' + global.translate('raffle.minWatchedTime').replace('(time)', raffle.minWatchedTime)
      }
      global.commons.sendMessage(message + '.', sender)

      if (!dashboard) {
        // remove any participants - don't delete in dashboard
        global.botDB.remove({ $where: function () { return this._id.startsWith('raffle_participant_') } }, { multi: true })
      }

      // register raffle keyword
      self.registerRaffleKeyword(self)
      self.lastAnnounce = new Date().getTime()
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('raffle.open.error'))
  }
}

Raffles.prototype.close = function (self, sender, text) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err, { fnc: 'Raffles.prototype.close' })
    if (!_.isNull(item)) {
      global.botDB.update({_id: 'raffle'}, {$set: {locked: true}}, {}, function (err) {
        if (err) return log.error(err, { fnc: 'Raffles.prototype.close' })
        global.commons.sendMessage(global.translate('raffle.close.ok'), sender)
      })

      clearInterval(self.timer)
      global.parser.unregister('!' + item.keyword)
    } else {
      global.commons.sendMessage(global.translate('raffle.close.notRunning'), sender)
    }
  })
}

module.exports = new Raffles()
