'use strict'

// 3rdparty libraries
var _ = require('lodash')
// bot libraries
var constants = require('../constants')

function Points () {
  if (global.commons.isSystemEnabled(this)) {
    global.parser.register(this, '!points add', this.addPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points remove', this.removePoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points all', this.allPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points set', this.setPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points get', this.getPointsFromUser, constants.OWNER_ONLY)
    global.parser.register(this, '!points give', this.givePoints, constants.VIEWERS)
    global.parser.register(this, '!makeitrain', this.rainPoints, constants.OWNER_ONLY)
    global.parser.register(this, '!points', this.getPoints, constants.VIEWERS)

    // default is <singular>|<plural> | in some languages can be set with custom <singular>|<x:multi>|<plural> where x <= 10
    global.configuration.register('pointsName', 'points.settings.pointsName', 'string', '')
    global.configuration.register('pointsResponse', 'points.settings.pointsResponse', 'string', '')
    global.configuration.register('pointsInterval', 'points.settings.pointsInterval', 'number', 10)
    global.configuration.register('pointsPerInterval', 'points.settings.pointsPerInterval', 'number', 1)
    global.configuration.register('pointsIntervalOffline', 'points.settings.pointsIntervalOffline', 'number', 30)
    global.configuration.register('pointsPerIntervalOffline', 'points.settings.pointsPerIntervalOffline', 'number', 1)
    global.configuration.register('pointsMessageInterval', 'points.settings.pointsMessageInterval', 'number', 5)
    global.configuration.register('pointsPerMessageInterval', 'points.settings.pointsPerMessageInterval', 'number', 1)

    global.parser.registerParser(this, '9-points', this.messagePoints, constants.VIEWERS)

    // add events for join/part
    var self = this
    setTimeout(function () {
      self.addEvents(self)
    }, 1000)
    // count Points - every 30s check points
    setInterval(function () {
      self.updatePoints()
    }, 30000)

    this.webPanel()
  }
}

Points.prototype.webPanel = function () {
  global.panel.addMenu({category: 'settings', name: 'systems', id: 'systems'})

  global.panel.socketListening(this, 'setPoints', this.setSocket)
  global.panel.socketListening(this, 'getPointsConfiguration', this.sendConfiguration)
  global.panel.socketListening(this, 'resetPoints', this.resetPoints)
}

Points.prototype.setSocket = function (self, socket, data) {
  self.setPoints(self, {username: global.configuration.get().twitch.channel}, data.username + ' ' + data.value) // we want to show this in chat
}

Points.prototype.resetPoints = function (self, socket, data) {
  global.users.setAll({points: 0})
}

Points.prototype.sendConfiguration = function (self, socket) {
  var pointsNames
  if (global.configuration.getValue('pointsName').length === 0) {
    pointsNames = []
    pointsNames.push(global.translate('points.defaults.pointsName.single'))
    if (global.translate('points.defaults.pointsName.xmulti').indexOf('missing_translation') === -1) {
      pointsNames.push(global.translate('points.defaults.pointsName.xmulti'))
    }
    pointsNames.push(global.translate('points.defaults.pointsName.multi'))
    pointsNames = pointsNames.join('|')
  } else {
    pointsNames = global.configuration.getValue('pointsName')
  }

  var pointsResponse = global.configuration.getValue('pointsResponse')
  pointsResponse = pointsResponse.length === 0 ? global.translate('points.defaults.pointsResponse') : pointsResponse

  socket.emit('pointsConfiguration', {
    pointsName: pointsNames,
    pointsResponse: pointsResponse,
    pointsInterval: global.configuration.getValue('pointsInterval'),
    pointsPerInterval: global.configuration.getValue('pointsPerInterval'),
    pointsIntervalOffline: global.configuration.getValue('pointsIntervalOffline'),
    pointsPerIntervalOffline: global.configuration.getValue('pointsPerIntervalOffline'),
    pointsMessageInterval: global.configuration.getValue('pointsMessageInterval'),
    pointsPerMessageInterval: global.configuration.getValue('pointsPerMessageInterval')
  })
}

Points.prototype.addEvents = function (self) {
  global.client.on('join', function (channel, username, fromSelf) {
    if (!fromSelf) {
      self.startCounting(username)
    }
  })
}

Points.prototype.messagePoints = function (self, id, sender, text, skip) {
  if (skip || text.startsWith('!')) {
    global.updateQueue(id, true)
    return
  }

  const points = parseInt(global.configuration.getValue('pointsPerMessageInterval'), 10)
  const interval = parseInt(global.configuration.getValue('pointsMessageInterval'), 10)
  const user = global.users.get(sender.username)

  let lastMessageCount = _.isNil(user.custom.lastMessagePoints) ? 0 : user.custom.lastMessagePoints

  if (lastMessageCount + interval <= user.stats.messages) {
    global.users.set(sender.username, {
      points: (_.isFinite(user.points) && _.isNumber(user.points) ? user.points + points : points),
      custom: { lastMessagePoints: user.stats.messages }
    })
  }
  global.updateQueue(id, true)
}

Points.prototype.setPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([0-9]+)$/)
    global.users.set(parsed[1], { points: parseInt(parsed[2], 10) })
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
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([0-9]+)$/)
    var givePts = parseInt(parsed[2], 10)

    const user = global.users.get(sender.username)
    const user2 = global.users.get(parsed[1])
    if (parseInt(user.points, 10) >= givePts) {
      if (user.username !== user2.username) {
        global.users.set(sender.username, { points: parseInt(user.points, 10) - givePts })
        global.users.set(user2.username, { points:
          (_.isFinite(parseInt(user2.points, 10)) && _.isNumber(parseInt(user2.points, 10))
          ? parseInt(user2.points, 10) + givePts : givePts) })
      }
      global.commons.sendMessage(global.translate('points.success.give')
        .replace('(amount)', givePts)
        .replace('(username)', user2.username)
        .replace('(pointsName)', self.getPointsName(givePts)), sender)
    } else {
      global.commons.sendMessage(global.translate('points.failed.giveNotEnough')
      .replace('(amount)', givePts)
      .replace('(username)', user2.username)
      .replace('(pointsName)', self.getPointsName(givePts)), sender)
    }
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.give'), sender)
  }
}

Points.prototype.getPointsName = function (points) {
  var pointsNames = global.configuration.getValue('pointsName').split('|').map(Function.prototype.call, String.prototype.trim)
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
          pattern = parseInt(pattern, 10)
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
  if (!_.isNull(xmulti) && _.isObject(xmulti) && points > 1 && points <= 10) {
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
    let user
    const username = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+)$/)[1]

    // find if user exists
    if (_.isNil(_.find(global.users.users, function (o) { return o.username === username }))) {
      user = { username: username, points: 0 }
    } else {
      user = global.users.get(username)
    }

    var pointsResponse = (global.configuration.getValue('pointsResponse').length > 0 ? global.configuration.getValue('pointsResponse') : global.translate('points.defaults.pointsResponse'))
    var points = (_.isUndefined(user.points) ? 0 : user.points)
    global.commons.sendMessage(pointsResponse
      .replace('(amount)', points)
      .replace('(username)', username)
      .replace('(pointsName)', self.getPointsName(points)), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.get'), sender)
  }
}

Points.prototype.allPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)
    _.each(global.users.getAll({ is: { online: true } }), function (user) {
      var availablePts = parseInt(user.points, 10)
      global.users.set(user.username, { points: (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + givePts : givePts) })
    })
    global.commons.sendMessage(global.translate('points.success.all')
      .replace('(amount)', givePts)
      .replace('(pointsName)', self.getPointsName(givePts)), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.all'), sender)
  }
}

Points.prototype.rainPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([0-9]+)$/)
    var givePts = parseInt(parsed[1], 10)
    _.each(global.users.getAll({ is: { online: true } }), function (user) {
      var availablePts = parseInt(user.points, 10)
      var random = Math.floor(Math.random() * givePts)
      global.users.set(user.username, { points: (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + random : random) })
    })
    global.commons.sendMessage(global.translate('points.success.rain')
      .replace('(amount)', givePts)
      .replace('(pointsName)', self.getPointsName(givePts)), sender)
  } catch (err) {
    global.commons.sendMessage(global.translate('points.failed.rain'), sender)
  }
}

Points.prototype.addPoints = function (self, sender, text) {
  try {
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([0-9]+)$/)
    const user = global.users.get(parsed[1])
    var givePts = parseInt(parsed[2], 10)
    var availablePts = parseInt(user.points, 10)
    global.users.set(parsed[1], { points: (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + givePts : givePts) })
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
    var parsed = text.match(/^([\u0500-\u052F\u0400-\u04FF\w]+) ([0-9]+)$/)
    const user = global.users.get(parsed[1])
    var removePts = parseInt(parsed[2], 10)
    var availablePts = parseInt(user.points, 10)
    if (availablePts > removePts) global.users.set(user.username, { points: (_.isFinite(availablePts) && !_.isNumber(availablePts) ? availablePts - removePts : 0) })
    else global.users.set(user.username, { points: 0 })
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
  global.users.set(username, { time: { points: parseInt(new Date().getTime(), 10) } })
}

Points.prototype.updatePoints = function () {
  var interval = (global.twitch.isOnline ? global.configuration.getValue('pointsInterval') * 60 * 1000 : global.configuration.getValue('pointsIntervalOffline') * 60 * 1000)
  var ptsPerInterval = (global.twitch.isOnline ? global.configuration.getValue('pointsPerInterval') : global.configuration.getValue('pointsPerIntervalOffline'))

  _.each(global.users.getAll({ is: { online: true } }), function (user) {
    user.time.points = _.isUndefined(user.time.points) ? 0 : user.time.points
    if (new Date().getTime() - user.time.points >= interval) {
      let availablePts = parseInt(user.points, 10)
      global.users.set(user.username, { points: (_.isFinite(availablePts) && _.isNumber(availablePts) ? availablePts + ptsPerInterval : ptsPerInterval) })
      global.users.set(user.username, { time: { points: new Date().getTime() } })
    }
  })
}

module.exports = new Points()
