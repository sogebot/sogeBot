'use strict'

var express = require('express')
var http = require('http')
var path = require('path')
var basicAuth = require('basic-auth')
var _ = require('lodash')

const NOT_AUTHORIZED = '0'

function Panel () {
  // setup static server
  var app = express()
  var server = http.createServer(app)
  var port = process.env.PORT || global.configuration.get().panel.port

  // static routing
  app.use(this.authUser, express.static(path.join(__dirname, '..', 'public')))

  server.listen(port, function () {
    global.log.info('WebPanel is listening on %s', port)
  })

  this.io = require('socket.io')(server)
  this.menu = [{category: 'main', icon: 'dashboard', name: 'dashboard'}]
  this.widgets = []
  this.socketListeners = []

  var self = this
  this.io.on('connection', function (socket) {
    self.sendMenu(socket)
    self.sendWidget(socket)

    _.each(self.socketListeners, function (listener) {
      socket.on(listener.on, function () {
        listener.fnc(listener.self, socket)
      })
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

Panel.prototype.addWidget = function (widget) { this.widgets.push(widget) }

Panel.prototype.sendWidget = function (socket) { socket.emit('widgets', this.widgets) }

Panel.prototype.socketListening = function (self, on, fnc) {
  this.socketListeners.push({self: self, on: on, fnc: fnc})
}
module.exports = Panel
