'use strict'
var chalk = require('chalk')
var constants = require('../constants')
var User = require('../user')
var _ = require('lodash')

var log = global.log

function Points () {
  if (global.configuration.get().systems.points === true) {
    global.parser.register(this, '!points add', this.addPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points remove', this.removePoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points all', this.allPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points set', this.setPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points get', this.getPointsFromUser, constants.OWNER_ONLY)
    global.parser.register(this, '!points give', this.givePoints, constants.VIEWERS)
    global.parser.register(this, '!makeitrain', this.rainPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points', this.getPoints, constants.VIEWERS)

    // default is <singular>|<plural> | in some languages can be set with custom <singular>|<x:multi>|<plural> where x <= 10
    global.configuration.register('pointsName', 'Points name was set to (value) format', 'string', '')
    global.configuration.register('pointsResponse', 'Points response was changed to: (value)', 'string', '')
    global.configuration.register('pointsInterval', 'Points online interval set to (value) minutes', 'number', 10)
    global.configuration.register('pointsPerInterval', 'Points when online was set to (value) per online interval', 'number', 1)
    global.configuration.register('pointsIntervalOffline', 'Points offline interval set to (value) minutes', 'number', 30)
    global.configuration.register('pointsPerIntervalOffline', 'Points when offline was set to (value) per offline interval', 'number', 1)

    // add events for join/part
    var self = this
    setTimeout(function () {
      self.addEvents(self)
    }, 1000)
    // count Points - every 30s check points
    setInterval(function () {
      self.updatePoints()
    }, 30000)
  }
  log.info('Points system ' + global.translate('core.loaded') + ' ' + (global.configuration.get().systems.points === true ? chalk.green(global.translate('core.enabled')) : chalk.red(global.translate('core.disabled'))))
}

Points.prototype.addEvents = function (self) {
  global.client.on('join', function (channel, username, fromSelf) {
    if (!fromSelf) {
      self.startCounting(username)
    }
  })
}

Points.prototype.setPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\w]+) ([0-9]+)$/)
    var user = new User(parsed[1])
    user.set('points', parseInt(parsed[2], 10))
    global.commons.sendMessage(global.translate('points.success.set')
      .replace('(amount)', parsed[2])
      .replace('(username)', parsed[1])
      .replace('(pointsName)', self.getPointsName(parsed[2])), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.set'), sender)
  }
}

Points.prototype.givePoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\w]+) ([0-9]+)$/)
    var givePts = parseInt(parsed[2], 10)
    var fromUser = new User(sender.username)
    var toUser = new User(parsed[1])

    fromUser.isLoaded().then(function () {
      var availablePts = parseInt(fromUser.get('points'), 10)
      if (availablePts >= givePts) {
        fromUser.set('points', availablePts - givePts)
        toUser.isLoaded().then(function () {
          var availablePts = parseInt(toUser.get('points'), 10)
          toUser.set('points', (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + givePts : givePts))
          global.commons.sendMessage(global.translate('points.success.give')
            .replace('(amount)', givePts)
            .replace('(username)', parsed[1])
            .replace('(pointsName)', self.getPointsName(givePts)), sender)
        })
      } else {
        global.commons.sendMessage(global.translate('points.failed.giveNotEnough')
        .replace('(amount)', givePts)
        .replace('(username)', parsed[1])
        .replace('(pointsName)', self.getPointsName(givePts)), sender)
      }
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.give'), sender)
  }
}

Points.prototype.getPointsName = function (points) {
  var pointsNames = global.configuration.getValue('pointsName').split('|')
  var single, multi, xmulti
  // get single|x:multi|multi from pointsName
  if (global.configuration.getValue('pointsName').length === 0) {
    xmulti = global.translate('points.defaults.pointsName.xmulti')
    single = global.translate('points.defaults.pointsName.single')
    multi = global.translate('points.defaults.pointsName.multi')
  } else {
    switch (pointsNames.length) {
      case 1:
        xmulti = null
        single = multi = pointsNames[0]
        break
      case 2:
        single = pointsNames[0]
        multi = pointsNames[1]
        xmulti = null
        break
      default:
        var len = pointsNames.length
        single = pointsNames[0]
        multi = pointsNames[len - 1]
        xmulti = {}

        for (var pattern in pointsNames) {
          if (pointsNames.hasOwnProperty(pattern) && pattern !== 0 && pattern !== len - 1) {
            var maxPts = pointsNames[pattern].split(':')[0]
            var name = pointsNames[pattern].split(':')[1]
            xmulti[maxPts] = name
          }
        }
        break
    }
  }

  var pointsName = (points === 1 ? single : multi)
  if (typeof xmulti === 'object' && points > 1 && points <= 10) {
    for (var i = points; i <= 10; i++) {
      if (typeof xmulti[i] === 'string') {
        pointsName = xmulti[i]
        break
      }
    }
  }
  return pointsName
}

Points.prototype.getPointsFromUser = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\w]+)$/)
    var user = new User(parsed[1])
    user.isLoaded().then(function () {
      var pointsResponse = (global.configuration.getValue('pointsResponse').length > 0 ? global.configuration.getValue('pointsResponse') : global.translate('points.defaults.pointsResponse'))
      var points = (_.isUndefined(user.get('points')) ? 0 : user.get('points'))
      global.commons.sendMessage(pointsResponse
        .replace('(amount)', points)
        .replace('(username)', parsed[1])
        .replace('(pointsName)', self.getPointsName(points)), sender)
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.get'), sender)
  }
}

Points.prototype.allPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)
    User.getAllOnline().then(function (users) {
      _.each(users, function (user) {
        user = new User(user.username)
        user.isLoaded().then(function () {
          var availablePts = parseInt(user.get('points'), 10)
          user.set('points', (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + givePts : givePts))
        })
      })
      global.commons.sendMessage(global.translate('points.success.all')
        .replace('(amount)', givePts)
        .replace('(pointsName)', self.getPointsName(givePts)), sender)
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.all'), sender)
  }
}

Points.prototype.rainPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)
    User.getAllOnline().then(function (users) {
      _.each(users, function (user) {
        var random = Math.floor(Math.random() * givePts)
        user = new User(user.username)
        user.isLoaded().then(function () {
          var availablePts = parseInt(user.get('points'), 10)
          user.set('points', (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + random : random))
        })
      })
      global.commons.sendMessage(global.translate('points.success.rain')
        .replace('(amount)', givePts)
        .replace('(pointsName)', self.getPointsName(givePts)), sender)
    })
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.rain'), sender)
  }
}

Points.prototype.addPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\w]+) ([0-9]+)$/)
    var user = new User(parsed[1])
    var givePts = parseInt(parsed[2], 10)
    user.isLoaded().then(function (users) {
      var availablePts = parseInt(user.get('points'), 10)
      user.set('points', (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + givePts : givePts))
    })
    global.commons.sendMessage(global.translate('points.success.add')
      .replace('(amount)', givePts)
      .replace('(username)', parsed[1])
      .replace('(pointsName)', self.getPointsName(givePts)), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.add'), sender)
  }
}

Points.prototype.removePoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\w]+) ([0-9]+)$/)
    var user = new User(parsed[1])
    var removePts = parseInt(parsed[2], 10)
    user.isLoaded().then(function (users) {
      var availablePts = parseInt(user.get('points'), 10)
      if (availablePts > removePts) user.set('points', (_.isFinite(availablePts) && !_.isNumber(availablePts) ? availablePts - removePts : 0))
      else user.set('points', 0)
    })
    global.commons.sendMessage(global.translate('points.success.remove')
      .replace('(amount)', removePts)
      .replace('(username)', parsed[1])
      .replace('(pointsName)', self.getPointsName(removePts)), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.remove'), sender)
  }
}

Points.prototype.getPoints = function (self, sender) {
  self.getPointsFromUser(self, sender, sender.username)
}

Points.prototype.startCounting = function (username) {
  var user = new User(username)
  user.isLoaded().then(function () {
    var partedTime = (user.get('partedTime') === 0 ? user.get('pointsGrantedAt') : user.get('partedTime')) // if not correctly parted
    var pointsGrantedAt = new Date().getTime() + (user.get('pointsGrantedAt') - partedTime)
    user.set('pointsGrantedAt', (_.isFinite(parseInt(pointsGrantedAt, 10)) && _.isNumber(parseInt(pointsGrantedAt, 10)) ? parseInt(pointsGrantedAt, 10) : new Date().getTime()))
  })
}

Points.prototype.updatePoints = function () {
  var interval = (global.twitch.isOnline ? global.configuration.getValue('pointsInterval') * 60 * 1000 : global.configuration.getValue('pointsIntervalOffline') * 60 * 1000)
  var ptsPerInterval = (global.twitch.isOnline ? global.configuration.getValue('pointsPerInterval') : global.configuration.getValue('pointsPerIntervalOffline'))

  User.getAllOnline().then(function (users) {
    _.each(users, function (user) {
      if (new Date().getTime() - user.pointsGrantedAt >= interval) {
        user = new User(user.username)
        user.isLoaded().then(function () {
          var availablePts = parseInt(user.get('points'), 10)
          user.set('points', (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + ptsPerInterval : ptsPerInterval))
          user.set('pointsGrantedAt', new Date().getTime())
        })
      }
    })
  })
}

module.exports = new Points()
