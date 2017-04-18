'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')
var log = global.log

/*
 * !raffle                                             - gets an info about raffle
 * !raffle open [raffle-keyword] [product] [followers] - open a new raffle with selected keyword for specified product (optional), for followers? (optional)
 * !raffle close                                       - close a raffle manually
 * !raffle pick                                        - pick or repick a winner of raffle
 * ![raffle-keyword]                                   - join a raffle
 * !set raffleAnnounceInterval [minutes]               - reannounce raffle interval each x minutes
 */

function Raffles () {
  if (global.commons.isSystemEnabled(this)) {
    this.timer = null
    this.keyword = null

    global.parser.register(this, '!raffle pick', this.pick, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle close', this.close, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle open', this.open, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle', this.info, constants.VIEWERS)
    global.parser.registerHelper('!raffle')
    global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)

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
      global.commons.sendMessage(global.translate('raffle.pick.winner')
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
      if (item.followers) {
        const user = global.users.get(sender.username)
        participant.eligible = _.isUndefined(user.is.follower) ? false : user.is.follower
        global.botDB.insert(participant)
      } else { global.botDB.insert(participant) }
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
        global.commons.sendMessage(message, sender)
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

    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ?(.*)?/)
    var groups = { keyword: 1, product: 2 }
    var raffle = {
      keyword: parsed[groups.keyword],
      followers: followers,
      product: !_.isNil(parsed[groups.product]) ? parsed[groups.product] : '',
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
      global.commons.sendMessage(message, sender)

      if (!dashboard) {
        // remove any participants - don't delete in dashboard
        global.botDB.remove({ $where: function () { return this._id.startsWith('raffle_participant_') } }, { multi: true })
      }

      // register raffle keyword
      self.registerRaffleKeyword(self)

      // add timer if raffleAnnounceInterval is set
      if (global.configuration.getValue('raffleAnnounceInterval')) {
        clearInterval(self.timer)
        self.timer = setInterval(function () {
          global.commons.sendMessage(global.translate('raffle.open.notice')
              .replace('(keyword)', raffle.keyword), sender)
        }, global.configuration.getValue('raffleAnnounceInterval') * 60 * 1000)
      }
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

        clearInterval(self.timer)
        global.parser.unregister('!' + item.keyword)
      })
    } else {
      global.commons.sendMessage(global.translate('raffle.close.notRunning'), sender)
    }
  })
}

module.exports = new Raffles()
