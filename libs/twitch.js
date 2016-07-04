'use strict'

var constants = require('./constants')
var User = require('./user')
var moment = require('moment')
var _ = require('lodash')
require('moment-precise-range-plugin')

function Twitch () {
  this.isOnline = false
  this.whenOnline = moment()

  var self = this
  setInterval(function () {
    global.client.api({
      url: 'https://api.twitch.tv/kraken/streams/' + global.configuration.get().twitch.owner
    }, function (err, res, body) {
      if (err) console.log(err)
      if (body.stream) {
        if (!self.isOnline) self.whenOnline = moment()
        self.isOnline = true
      } else self.isOnline = false
    })
  }, 15000)

  global.parser.register(this, '!uptime', this.uptime, constants.VIEWERS)
  global.parser.register(this, '!lastseen', this.lastseen, constants.VIEWERS)
}

Twitch.prototype.isOnline = function () {
  return this.isOnline
}

Twitch.prototype.uptime = function (self, sender) {
  var now = moment().preciseDiff(self.whenOnline, true)
  var days = now.days > 0 ? now.days + 'd' : ''
  var hours = now.hours > 0 ? now.hours + 'h' : ''
  var minutes = now.minutes > 0 ? now.minutes + 'm' : ''
  var seconds = now.seconds > 0 ? now.seconds + 's' : ''
  global.commons.sendMessage(self.isOnline ? global.translate('core.online').replace('(time)', days + hours + minutes + seconds) : global.translate('core.offline'))
}

Twitch.prototype.lastseen = function (self, sender, text) {
  try {
    var parsed = text.match(/^(\w+)$/)
    var user = new User(parsed[0])
    user.isLoaded().then(function () {
      var isOnline = user.get('isOnline')
      var partedTime = user.get('partedTime')
      if (isOnline) {
        global.commons.sendMessage(global.translate('lastseen.success.online').replace('(username)', parsed[0]), sender)
      } else if (_.isNull(partedTime) || _.isUndefined(partedTime)) {
        global.commons.sendMessage(global.translate('lastseen.success.never').replace('(username)', parsed[0]), sender)
      } else {
        var timestamp = moment.unix(partedTime / 1000)
        global.commons.sendMessage(global.translate('lastseen.success.offline')
          .replace('(username)', parsed[0])
          .replace('(when)', timestamp.format('DD-MM-YYYY HH:mm:ss')), sender)
      }
    })
  } catch (e) {
    global.commons.sendMessage(global.translate('lastseen.failed.parse'), sender)
  }
}

module.exports = Twitch
