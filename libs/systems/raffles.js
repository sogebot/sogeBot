'use strict'

var User = require('../user')

var chalk = require('chalk')
var constants = require('../constants')
var _ = require('lodash')
var log = global.log

/*
 * !raffle                                           - gets an info about raffle
 * !raffle open [raffle-keyword] [followers]         - open a new raffle with selected keyword, for followers? (optional)
 * !raffle close                                     - close a raffle manually
 * !raffle pick                                      - pick or repick a winner of raffle
 * ![raffle-keyword]                                 - join a raffle
 * !set raffleAnnounceInterval [minutes]             - reannounce raffle interval each x minutes
 */

function Raffles () {
  if (global.configuration.get().systems.raffles === true) {
    this.timer = null
    this.keyword = null

    global.parser.register(this, '!raffle pick', this.pick, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle close', this.close, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle open', this.open, constants.OWNER_ONLY)
    global.parser.register(this, '!raffle', this.info, constants.VIEWERS)
    global.parser.registerHelper('!raffle')
    global.configuration.register('raffleAnnounceInterval', 'raffle.announceInterval', 'number', 10)

    this.registerRaffleKeyword(this)

    global.panel.socketListening(this, 'getRafflesConfiguration', this.sendConfiguration)
  }
  log.info('Raffles system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.raffles === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Raffles.prototype.sendConfiguration = function (self, socket) {
  socket.emit('rafflesConfiguration', {
    raffleAnnounceInterval: global.configuration.getValue('raffleAnnounceInterval')
  })
}

Raffles.prototype.registerRaffleKeyword = function (self) {
  if (!_.isNull(self.keyword)) global.parser.unregister('!' + self.keyword)
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      global.parser.register(this, '!' + item.keyword, self.participate, constants.VIEWERS)
      self.keyword = item.keyword
    }
  })
}

Raffles.prototype.pick = function (self, sender) {
  global.botDB.find({ $where: function () { return this._id.startsWith('raffle_participant_') && this.eligible } }, function (err, items) {
    if (err) return log.error(err)
    var winner = { username: null }
    if (items.length !== 0) {
      winner = _.sample(items)
      global.botDB.update({ _id: winner._id }, { $set: { eligible: false } }) // don't want to pick same winner 2 times
    }

    if (_.isNull(winner.username)) {
      global.commons.sendMessage(global.translate('raffle.pick.noParticipants'), sender)
    } else {
      var user = new User(winner.username)
      user.isLoaded().then(function () {
        global.botDB.update({_id: 'raffle'}, {$set: { winner: user, locked: true, timestamp: new Date().getTime() }})
        global.commons.sendMessage(global.translate('raffle.pick.winner')
          .replace('(winner)', winner.username), sender)
        global.parser.unregister('!' + self.keyword)
        global.widgets.raffles.sendWinner(global.widgets.raffles, user)
        clearInterval(self.timer)
      })
    }
  })
}

Raffles.prototype.participate = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item) && !item.locked) {
      var participant = { _id: 'raffle_participant_' + sender.username,
                          eligible: true,
                          forced: false,
                          username: sender.username }
      if (item.followers) {
        var user = new User(sender.username)
        user.isLoaded().then(function () {
          participant.eligible = user.get('isFollower')
          global.botDB.insert(participant)
        })
      } else { global.botDB.insert(participant) }
    }
  })
}

Raffles.prototype.info = function (self, sender) {
  global.botDB.findOne({_id: 'raffle'}, function (err, item) {
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      if (!_.isNull(item.winner)) global.commons.sendMessage(global.translate('raffle.info.notRunning'), sender)
      else if (!item.locked) {
        global.commons.sendMessage(global.translate('raffle.info.opened')
          .replace('(keyword)', item.keyword), sender)
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
    var parsed = text.match(/^(\w+) ?(followers)?/)
    var groups = { keyword: 1, followers: 2 }
    var raffle = {
      keyword: parsed[groups.keyword],
      followers: parsed[groups.followers] != null,
      winner: null,
      locked: false
    }

    global.botDB.update({_id: 'raffle'}, {$set: raffle}, {upsert: true}, function (err) {
      if (err) return log.error(err)
      if (!dashboard) {
        global.commons.sendMessage(global.translate('raffle.open.ok').replace('(keyword)', raffle.keyword), sender)

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
    if (err) return log.error(err)
    if (!_.isNull(item)) {
      global.botDB.update({_id: 'raffle'}, {$set: {locked: true}}, {}, function (err) {
        if (err) return log.error(err)
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

