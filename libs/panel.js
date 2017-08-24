'use strict'

var express = require('express')
var http = require('http')
var path = require('path')
var basicAuth = require('basic-auth')
var _ = require('lodash')
var log = global.log

const NOT_AUTHORIZED = '0'

function Panel () {
  // setup static server
  var app = express()
  var server = http.createServer(app)
  var port = process.env.PORT || global.configuration.get().panel.port

  // static routing
  app.get('/auth/token.js', function (req, res) {
    res.set('Content-Type', 'application/javascript')
    res.send('const token="' + global.configuration.get().panel.token.trim() + '"')
  })
  app.get('/playlist', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'playlist', 'index.html'))
  })
  app.get('/overlays/:overlay', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'overlays', req.params.overlay + '.html'))
  })
  app.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.ico'))
  })
  app.get('/', this.authUser, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })
  app.get('/:type/:page', this.authUser, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', req.params.type, req.params.page))
  })
  app.use('/dist', express.static(path.join(__dirname, '..', 'public', 'dist')))

  server.listen(port, function () {
    global.log.info('WebPanel is available at http://localhost:%s', port)
  })

  this.io = require('socket.io')(server)
  this.menu = [{category: 'main', name: 'dashboard', id: 'dashboard'}]
  this.widgets = []
  this.socketListeners = []

  global.configuration.register('theme', 'core.theme', 'string', 'light')
  global.configuration.register('percentage', 'core.percentage', 'bool', true)

  var self = this
  this.io.on('connection', function (socket) {
    // check auth
    const token = global.configuration.get().panel.token.trim()
    socket.on('authenticate', function (aToken) {
      if (aToken !== token) return
      socket.emit('authenticated')

      self.sendMenu(socket)
      self.sendWidget(socket)

      // twitch game and title change
      socket.on('getGameFromTwitch', function (game) { global.twitch.sendGameFromTwitch(global.twitch, socket, game) })
      socket.on('getUserTwitchGames', function () { global.twitch.sendUserTwitchGamesAndTitles(global.twitch, socket) })
      socket.on('deleteUserTwitchGame', function (game) { global.twitch.deleteUserTwitchGame(global.twitch, socket, game) })
      socket.on('deleteUserTwitchTitle', function (data) { global.twitch.deleteUserTwitchTitle(global.twitch, socket, data) })
      socket.on('editUserTwitchTitle', function (data) { global.twitch.editUserTwitchTitle(global.twitch, socket, data) })
      socket.on('updateGameAndTitle', function (data) { global.twitch.updateGameAndTitle(global.twitch, socket, data) })

      socket.on('getWidgetList', function () { self.sendWidgetList(self, socket) })
      socket.on('addWidget', function (widget, row) { self.addWidgetToDb(self, widget, row, socket) })
      socket.on('deleteWidget', function (widget) { self.deleteWidgetFromDb(self, widget) })
      socket.on('getConnectionStatus', function () { socket.emit('connectionStatus', global.status) })
      socket.on('saveConfiguration', function (data) {
        _.each(data, function (index, value) {
          if (value.startsWith('_')) return true
          global.configuration.setValue(global.configuration, { username: global.configuration.get().username }, value + ' ' + index, data._quiet)
        })
      })
      socket.on('getConfiguration', function () {
        var data = {}
        _.each(global.configuration.sets(global.configuration), function (key) {
          data[key] = global.configuration.getValue(key)
        })
        socket.emit('configuration', data)
      })

      // send enabled systems
      socket.on('getSystems', function () { socket.emit('systems', global.configuration.get().systems) })
      socket.on('getVersion', function () { socket.emit('version', process.env.npm_package_version) })

      socket.on('parser.isRegistered', function (data) {
        socket.emit(data.emit, { isRegistered: global.parser.isRegistered(data.command) })
      })

      _.each(self.socketListeners, function (listener) {
        socket.on(listener.on, function (data) {
          if (typeof listener.fnc !== 'function') {
            throw new Error('Function for this listener is undefined' +
              ' widget=' + listener.self.constructor.name + ' on=' + listener.on)
          }
          listener.fnc(listener.self, self.io, data)
        })
      })

      // send webpanel translations
      socket.emit('lang', global.translate({root: 'webpanel'}))
    })
  })
}

Panel.prototype.authUser = function (req, res, next) {
  var user = basicAuth(req)
  try {
    if (user.name === global.configuration.get().panel.username &&
        user.pass === global.configuration.get().panel.password) {
      return next()
    } else {
      throw new Error(NOT_AUTHORIZED)
    }
  } catch (e) {
    res.set('WWW-Authenticate', 'Basic realm="Authorize to SogeBot WebPanel"')
    return res.sendStatus(401)
  }
}

Panel.prototype.addMenu = function (menu) { this.menu.push(menu) }

Panel.prototype.sendMenu = function (socket) { socket.emit('menu', this.menu) }

Panel.prototype.addWidget = function (id, name, icon) { this.widgets.push({id: id, name: name, icon: icon}) }

Panel.prototype.sendWidget = function (socket) {
  global.botDB.findOne({_id: 'dashboard_widgets'}, function (err, item) {
    if (err) { log.error(err, { fnc: 'Panel.prototype.sendWidget' }) }
    if (!_.isNull(item)) socket.emit('widgets', item.widgets)
  })
}

Panel.prototype.sendWidgetList = function (self, socket) {
  global.botDB.findOne({_id: 'dashboard_widgets'}, function (err, item) {
    if (err) { log.error(err, { fnc: 'Panel.prototype.sendWidgetList' }) }
    if (_.isNull(item)) socket.emit('widgetList', self.widgets) // we will return all possible widgets
    else {
      var sendWidgets = []
      _.each(self.widgets, function (widget) {
        if (item.widgets.indexOf('1:' + widget.id) === -1 && item.widgets.indexOf('2:' + widget.id) === -1 && item.widgets.indexOf('3:' + widget.id) === -1) sendWidgets.push(widget)
      })
      socket.emit('widgetList', sendWidgets)
    }
  })
}

Panel.prototype.addWidgetToDb = function (self, widget, row, socket) {
  global.botDB.update({ _id: 'dashboard_widgets' }, { $push: { widgets: { $each: [row + ':' + widget] } } }, { upsert: true }, function (err) {
    if (err) { log.error(err, { fnc: 'Panel.prototype.addWidgetToDb' }) }
    self.sendWidget(socket)
  })
}

Panel.prototype.deleteWidgetFromDb = function (self, widget) {
  for (var i = 1; i < 4; i++) {
    global.botDB.update({ _id: 'dashboard_widgets' }, { $pull: { widgets: i + ':' + widget } }, { upsert: true }, function (err) { if (err) { log.error(err, { fnc: 'Panel.prototype.deleteWidgetFromDb' }) } })
  }
}

Panel.prototype.socketListening = function (self, on, fnc) {
  this.socketListeners.push({self: self, on: on, fnc: fnc})
}
module.exports = Panel
