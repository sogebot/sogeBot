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
  app.use(this.authUser, express.static(path.join(__dirname, '..', 'public')))

  server.listen(port, function () {
    global.log.info('WebPanel is listening on %s', port)
  })

  this.io = require('socket.io')(server)
  this.menu = [{category: 'main', icon: 'dashboard', name: 'dashboard', id: 'dashboard'}]
  this.widgets = []
  this.socketListeners = []
  this.socket = null

  var self = this
  this.io.on('connection', function (socket) {
    self.sendMenu(socket)
    self.sendWidget(socket)

    self.updateSocket(socket)

    socket.on('getWidgetList', function () { self.sendWidgetList(self, socket) })
    socket.on('addWidget', function (widget, row) { self.addWidgetToDb(self, widget, row, socket) })
    socket.on('deleteWidget', function (widget) { self.deleteWidgetFromDb(self, widget) })

    _.each(self.socketListeners, function (listener) {
      socket.on(listener.on, function () {
        listener.fnc(listener.self, socket)
      })
    })
  })
}

Panel.prototype.updateSocket = function (socket) {
  this.socket = socket
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
    if (err) { log.error(err) }
    if (_.isNull(item)) return // we doesn't have any widgets to show
    else {
      socket.emit('widgets', item.widgets)
    }
  })
}

Panel.prototype.sendWidgetList = function (self, socket) {
  global.botDB.findOne({_id: 'dashboard_widgets'}, function (err, item) {
    if (err) { log.error(err) }
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
    if (err) { log.error(err) }
    self.sendWidget(socket)
  })
}

Panel.prototype.deleteWidgetFromDb = function (self, widget) {
  for (var i=1; i < 4; i++) {
    global.botDB.update({ _id: 'dashboard_widgets' }, { $pull: { widgets: i + ':' + widget } }, { upsert: true }, function (err) { if (err) { log.error(err) } })
  }
}

Panel.prototype.socketListening = function (self, on, fnc) {
  this.socketListeners.push({self: self, on: on, fnc: fnc})
}
module.exports = Panel
