'use strict'

import fs from 'fs'

var express = require('express')
const bodyParser = require('body-parser')
var http = require('http')
var path = require('path')
var basicAuth = require('basic-auth')
var _ = require('lodash')
const util = require('util')
const commons = require('./commons')
const gitCommitInfo = require('git-commit-info');

const Parser = require('./parser')

const config = require('@config')

const moment = require('moment-timezone')

const NOT_AUTHORIZED = '0'

function Panel () {
  // setup static server
  var app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  this.server = http.createServer(app)
  this.port = process.env.PORT || config.panel.port

  // webhooks integration
  app.post('/webhooks/hub/follows', (req, res) => {
    global.webhooks.follower(req.body)
    res.sendStatus(200)
  })
  app.post('/webhooks/hub/streams', (req, res) => {
    global.webhooks.stream(req.body)
    res.sendStatus(200)
  })

  app.get('/webhooks/hub/follows', (req, res) => {
    global.webhooks.challenge(req, res)
  })
  app.get('/webhooks/hub/streams', (req, res) => {
    global.webhooks.challenge(req, res)
  })

  // highlights system
  app.get('/highlights/:id', (req, res) => {
    global.systems.highlights.url(req, res)
  })

  // static routing
  app.use('/dist', express.static(path.join(__dirname, '..', 'public', 'dist')))
  app.get('/popout/', this.authUser, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'popout.html'))
  })
  app.get('/gallery/:id', async function (req, res) {
    const file = await global.db.engine.findOne(global.overlays.gallery.collection.data, { _id: req.params.id })
    if (!_.isEmpty(file)) {
      const data = Buffer.from(file.data.split(',')[1], 'base64')
      res.writeHead(200, {
        'Content-Type': file.type,
        'Content-Length': data.length
      })
      res.end(data)
    } else res.sendStatus(404)
  })
  app.get('/oauth/:page', this.authUser, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'oauth', req.params.page + '.html'))
  })
  app.get('/auth/token.js', async function (req, res) {
    const origin = req.headers.referer ? req.headers.referer.substring(0, req.headers.referer.length - 1) : undefined
    const domain = config.panel.domain.split(',').map((o) => o.trim()).join('|')
    if (_.isNil(origin)) {
      // file CANNOT be accessed directly
      res.status(401).send('401 Access Denied - This is not a file you are looking for.')
      return
    }

    if (origin.match(new RegExp('^((http|https)\\:\\/\\/|)([\\w|-]+\\.)?' + domain))) {
      res.set('Content-Type', 'application/javascript')
      res.send(`const token="${config.panel.token.trim()}"; const name="${global.oauth.botUsername}"`)
    } else {
      // file CANNOT be accessed from different domain
      res.status(403).send('403 Forbidden - You are looking at wrong castle.')
    }
  })
  app.get('/playlist', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'playlist', 'index.html'))
  })
  app.get('/overlays/:overlay', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'overlays.html'))
  })
  app.get('/overlays/:overlay/:id', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'overlays.html'))
  })
  app.get('/custom/:custom', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'custom', req.params.custom + '.html'))
  })
  app.get('/public/:public', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'public', req.params.public + '.html'))
  })
  app.get('/fonts', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'fonts.json'))
  })
  app.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.ico'))
  })
  app.get('/', this.authUser, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })
  app.get('/:type/registry/:subtype/:page', this.authUser, function (req, res) {
    const file = path.join(__dirname, '..', 'public', req.params.type, 'registry', req.params.subtype, req.params.page)
    if (fs.existsSync(file)) {
      res.sendFile(file)
    }
  })
  app.get('/:type/:subtype/:page', this.authUser, function (req, res) {
    const file = path.join(__dirname, '..', 'public', req.params.type, req.params.subtype, req.params.page)
    if (fs.existsSync(file)) {
      res.sendFile(file)
    }
  })
  app.get('/:type/:page', this.authUser, function (req, res) {
    try {
      res.sendFile(path.join(__dirname, '..', 'public', req.params.type, req.params.page))
    } catch (e) {}
  })

  this.io = require('socket.io')(this.server)
  this.menu = [{ category: 'main', name: 'dashboard', id: 'dashboard' }]
  this.widgets = []
  this.socketListeners = []

  this.addMenu({ category: 'settings', name: 'systems', id: 'systems' })

  this.registerSockets({
    self: this,
    expose: ['sendStreamData'],
    finally: null
  })

  this.io.use(function (socket, next) {
    if (config.panel.token.trim() === socket.request._query['token']) next()
    return false
  })

  var self = this
  this.io.on('connection', function (socket) {
    // check auth
    socket.emit('authenticated')

    self.sendMenu(socket)

    socket.on('metrics.translations', function (key) { global.lib.translate.addMetrics(key, true) })
    socket.on('getCachedTags', async (cb) => {
      cb(await global.db.engine.find('core.api.tags'))
    })
    // twitch game and title change
    socket.on('getGameFromTwitch', function (game) { global.api.sendGameFromTwitch(global.api, socket, game) })
    socket.on('getUserTwitchGames', async () => { socket.emit('sendUserTwitchGamesAndTitles', await global.db.engine.find('cache.titles')) })
    socket.on('deleteUserTwitchGame', async (game) => {
      let items = await global.db.engine.find('cache.titles', { game })
      for (let item of items) {
        await global.db.engine.remove('cache.titles', { _id: String(item._id) })
      }
      socket.emit('sendUserTwitchGamesAndTitles', await global.db.engine.find('cache.titles'))
    })
    socket.on('cleanupGameAndTitle', async (data, cb) => {
      // remove empty titles
      const emptyTitles = data.titles.filter(o => o.title.trim().length === 0);
      for (const t of emptyTitles) {
        await global.db.engine.remove('cache.titles', { _id: String(t._id) });
      }

      // update titles
      const updateTitles = data.titles.filter(o => o.title.trim().length > 0);
      for (const t of updateTitles) {
        if (t.title === data.title && t.game === data.game) {
          await global.db.engine.update('cache.titles', { _id: String(t._id) }, { title: t.title, timestamp: Date.now() });
        } else {
          await global.db.engine.update('cache.titles', { _id: String(t._id) }, { title: t.title });
        }
      }

      // remove removed titles
      let allTitles = await global.db.engine.find('cache.titles');
      for (const t of allTitles) {
        const titles = updateTitles.filter(o => o.game === t.game && o.title === t.title);
        if (titles.length === 0) {
          if (t.game !== data.game || t.title !== data.title) { // don't remove current/new title
            await global.db.engine.remove('cache.titles', { _id: String(t._id) });
          }
        }
      }

      // remove duplicates
      allTitles = await global.db.engine.find('cache.titles');
      for (const t of allTitles) {
        const titles = allTitles.filter(o => o.game === t.game && o.title === t.title);
        if (titles.length > 1) {
          // remove title if we have more than one title
          allTitles = allTitles.filter(o => String(o._id) !== String(t._id));
          await global.db.engine.remove('cache.titles', { _id: String(t._id) });
        }
      }
      cb(null, await global.db.engine.find('cache.titles'));
    });
    socket.on('updateGameAndTitle', async (data, cb) => {
      const status = await global.api.setTitleAndGame(null, data)
      await global.api.setTags(null, data.tags);

      if (!status) { // twitch refused update
        cb(true)
      }

      data.title = data.title.trim()
      data.game = data.game.trim()

      let item = await global.db.engine.findOne('cache.titles', { game: data.game, title: data.title.trim() })
      if (_.isEmpty(item)) {
        await global.db.engine.insert('cache.titles', { game: data.game, title: data.title })
      }

      self.sendStreamData(self, global.panel.io) // force dashboard update
      cb(null)
    })
    socket.on('joinBot', async () => {
      global.tmi.join('bot', global.tmi.channel)
    })
    socket.on('leaveBot', async () => {
      global.tmi.part('bot')
      global.db.engine.remove('users.online', {}) // force all users offline
    })

    // custom var
    socket.on('custom.variable.value', async (variable, cb) => {
      let value = global.translate('webpanel.not-available')
      let isVariableSet = await global.customvariables.isVariableSet(variable)
      if (isVariableSet) value = await global.customvariables.getValueOf(variable)
      cb(null, value)
    })

    socket.on('responses.get', async function (at, callback) {
      const responses = commons.flatten(!_.isNil(at) ? global.lib.translate.translations[global.general.lang][at] : global.lib.translate.translations[global.general.lang])
      _.each(responses, function (value, key) {
        let _at = !_.isNil(at) ? at + '.' + key : key
        responses[key] = {} // remap to obj
        responses[key].default = global.translate(_at, true)
        responses[key].current = global.translate(_at)
      })
      callback(responses)
    })
    socket.on('responses.set', function (data) {
      _.remove(global.lib.translate.custom, function (o) { return o.key === data.key })
      global.lib.translate.custom.push(data)
      global.lib.translate._save()

      let lang = {}
      _.merge(
        lang,
        global.translate({ root: 'webpanel' }),
        global.translate({ root: 'ui' }) // add ui root -> slowly refactoring to new name
      )
      socket.emit('lang', lang)
    })
    socket.on('responses.revert', async function (data, callback) {
      _.remove(global.lib.translate.custom, function (o) { return o.key === data.key })
      await global.db.engine.remove('customTranslations', { key: data.key })
      let translate = global.translate(data.key)
      callback(translate)
    })

    socket.on('getWidgetList', async (cb) => {
      let widgets = await global.db.engine.find('widgets')
      let dashboards = await global.db.engine.find('dashboards')
      if (_.isEmpty(widgets)) cb(self.widgets)
      else {
        var sendWidgets = []
        _.each(self.widgets, function (widget) {
          if (!_.includes(_.map(widgets, 'id'), widget.id)) {
            sendWidgets.push(widget)
          }
        })
        cb(sendWidgets, dashboards)
      }
    })

    socket.on('getWidgets', async (cb) => {
      let widgets = await global.db.engine.find('widgets')
      let dashboards = await global.db.engine.find('dashboards')
      cb(widgets, dashboards)
    })

    socket.on('createDashboard', async (name, cb) => {
      cb(await global.db.engine.insert('dashboards', { name, createdAt: Date.now() }))
    })

    socket.on('removeDashboard', async (_id) => {
      await global.db.engine.remove('dashboards', { _id })
      await global.db.engine.remove('widgets', { dashboardId: _id })
    })

    socket.on('addWidget', async function (widget, dashboardId, cb) {
      cb(await self.addWidgetToDb(self, widget, dashboardId, socket));
    })
    socket.on('updateWidgets', function (widgets) { self.updateWidgetsInDb(self, widgets, socket) })
    socket.on('getConnectionStatus', function () { socket.emit('connectionStatus', global.status) })
    socket.on('saveConfiguration', function (data) {
      _.each(data, async function (index, value) {
        if (value.startsWith('_')) return true
        global.general.setValue({ sender: { username: commons.getOwner() }, parameters: value + ' ' + index, quiet: data._quiet })
      })
    })
    socket.on('getConfiguration', async function (cb) {
      var data = {}

      for (let system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch']) {
        if (typeof data.core === 'undefined') {
          data.core = {}
        }
        data.core[system] = await global[system].getAllSettings()
      }

      for (let system of Object.keys(global.systems).filter(o => !o.startsWith('_'))) {
        if (!global.systems[system].settings) continue
        if (typeof data.systems === 'undefined') {
          data.systems = {}
        }
        data.systems[system] = await global.systems[system].getAllSettings()
      }

      for (let system of Object.keys(global.integrations).filter(o => !o.startsWith('_'))) {
        if (!global.integrations[system].settings) continue
        if (typeof data.integrations === 'undefined') {
          data.integrations = {}
        }
        data.integrations[system] = await global.integrations[system].getAllSettings()
      }

      for (let system of Object.keys(global.games).filter(o => !o.startsWith('_'))) {
        if (!global.games[system].settings) continue
        if (typeof data.games === 'undefined') {
          data.games = {}
        }
        data.games[system] = await global.games[system].getAllSettings()
      }

      // currencies
      data.currency = global.currency.mainCurrency
      data.currencySymbol = global.currency.symbol(global.currency.mainCurrency)

      // timezone
      data.timezone = config.timezone === 'system' || _.isNil(config.timezone) ? moment.tz.guess() : config.timezone

      // lang
      data.lang = global.general.lang;

      if (_.isFunction(cb)) cb(data)
      else socket.emit('configuration', data)
    })

    // send enabled systems
    socket.on('systems', async (cb) => {
      let toEmit = []
      for (let system of Object.keys(global.systems).filter(o => !o.startsWith('_'))) {
        toEmit.push({
          name: system.toLowerCase(),
          enabled: global.systems[system].enabled,
          areDependenciesEnabled: await global.systems[system]._dependenciesEnabled(),
          isDisabledByEnv: !_.isNil(process.env.DISABLE) && (process.env.DISABLE.toLowerCase().split(',').includes(system.toLowerCase()) || process.env.DISABLE === '*')
        })
      }
      cb(null, toEmit)
    })
    socket.on('core', async (cb) => {
      let toEmit = []
      for (let system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch']) {
        toEmit.push({
          name: system.toLowerCase()
        })
      }
      cb(null, toEmit)
    })
    socket.on('integrations', async (cb) => {
      let toEmit = []
      for (let system of Object.keys(global.integrations).filter(o => !o.startsWith('_'))) {
        if (!global.integrations[system].showInUI) continue
        toEmit.push({
          name: system.toLowerCase(),
          enabled: global.integrations[system].enabled,
          areDependenciesEnabled: await global.integrations[system]._dependenciesEnabled(),
          isDisabledByEnv: !_.isNil(process.env.DISABLE) && (process.env.DISABLE.toLowerCase().split(',').includes(system.toLowerCase()) || process.env.DISABLE === '*')
        })
      }
      cb(null, toEmit)
    })
    socket.on('overlays', async (cb) => {
      let toEmit = []
      for (let system of Object.keys(global.overlays).filter(o => !o.startsWith('_'))) {
        if (!global.overlays[system].showInUI) continue
        toEmit.push({
          name: system.toLowerCase(),
          enabled: global.overlays[system].enabled,
          areDependenciesEnabled: await global.overlays[system]._dependenciesEnabled(),
          isDisabledByEnv: !_.isNil(process.env.DISABLE) && (process.env.DISABLE.toLowerCase().split(',').includes(system.toLowerCase()) || process.env.DISABLE === '*')
        })
      }
      cb(null, toEmit)
    })
    socket.on('games', async (cb) => {
      let toEmit = []
      for (let system of Object.keys(global.games).filter(o => !o.startsWith('_'))) {
        if (!global.games[system].showInUI) continue
        toEmit.push({
          name: system.toLowerCase(),
          enabled: global.games[system].enabled,
          areDependenciesEnabled: await global.games[system]._dependenciesEnabled(),
          isDisabledByEnv: !_.isNil(process.env.DISABLE) && (process.env.DISABLE.toLowerCase().split(',').includes(system.toLowerCase()) || process.env.DISABLE === '*')
        })
      }
      cb(null, toEmit)
    })
    socket.on('getVersion', function () {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z')
      socket.emit('version', version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'))
    })

    socket.on('parser.isRegistered', function (data) {
      socket.emit(data.emit, { isRegistered: new Parser.default().find(data.command) })
    })

    _.each(self.socketListeners, function (listener) {
      socket.on(listener.on, async function (data) {
        if (typeof listener.fnc !== 'function') {
          throw new Error('Function for this listener is undefined' +
            ' widget=' + listener.self.constructor.name + ' on=' + listener.on)
        }
        try { await listener.fnc(listener.self, self.io, data) } catch (e) {
          global.log.error('Error on ' + listener.on + ' listener')
        }
        if (listener.finally && listener.finally !== listener.fnc) listener.finally(listener.self, self.io)
      })
    })

    // send webpanel translations
    let lang = {}
    _.merge(
      lang,
      global.translate({ root: 'webpanel' }),
      global.translate({ root: 'ui' }) // add ui root -> slowly refactoring to new name
    )
    socket.emit('lang', lang)
  })
}

Panel.prototype.expose = function () {
  this.server.listen(global.panel.port, function () {
    global.log.info(`WebPanel is available at http://localhost:${global.panel.port}`)
  })
}

Panel.prototype.authUser = async function (req, res, next) {
  var user = basicAuth(req)
  try {
    if (user.name === config.panel.username &&
        user.pass === config.panel.password) {
      return next()
    } else {
      throw new Error(NOT_AUTHORIZED)
    }
  } catch (e) {
    res.set('WWW-Authenticate', `Basic realm="Authorize to '${(await global.oauth.broadcasterUsername).toUpperCase()}' WebPanel`)
    return res.sendStatus(401)
  }
}

Panel.prototype.addMenu = function (menu) { this.menu.push(menu) }

Panel.prototype.sendMenu = function (socket) { socket.emit('menu', this.menu) }

Panel.prototype.addWidget = function (id, name, icon) { this.widgets.push({ id: id, name: name, icon: icon }) }

Panel.prototype.updateWidgetsInDb = async function (self, widgets, socket) {
  await global.db.engine.remove('widgets', {}) // remove widgets
  for (let widget of widgets) {
    global.db.engine.update('widgets', { id: widget.id }, { id: widget.id, dashboardId: widget.dashboardId, position: { x: widget.position.x, y: widget.position.y }, size: { width: widget.size.width, height: widget.size.height } })
  }
}

Panel.prototype.addWidgetToDb = async function (self, widget, dashboardId, socket) {
 return (await global.db.engine.update('widgets', { id: widget }, { dashboardId, id: widget, position: { x: 0, y: 0 }, size: { width: 4, height: 3 } }))
}

Panel.prototype.socketListening = function (self, on, fnc) {
  this.socketListeners.push({ self: self, on: on, fnc: fnc })
}

Panel.prototype.registerSockets = util.deprecate(function (options) {
  const name = options.self.constructor.name.toLowerCase()
  for (let fnc of options.expose) {
    if (!_.isFunction(options.self[fnc])) global.log.error(`Function ${fnc} of ${options.self.constructor.name} is undefined`)
    else this.socketListeners.push({ self: options.self, on: `${name}.${fnc}`, fnc: options.self[fnc], finally: options.finally })
  }
}, 'registerSockets() is deprecated. Use socket from system interface directly.')

Panel.prototype.sendStreamData = async function (self, socket) {
  const whenOnline = (await global.cache.when()).online
  var data = {
    broadcasterType: global.oauth.broadcasterType,
    uptime: commons.getTime(whenOnline, false),
    currentViewers: _.get(await global.db.engine.findOne('api.current', { key: 'viewers' }), 'value', 0),
    currentSubscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
    currentBits: _.get(await global.db.engine.findOne('api.current', { key: 'bits' }), 'value', 0),
    currentTips: _.get(await global.db.engine.findOne('api.current', { key: 'tips' }), 'value', 0),
    currency: global.currency.symbol(global.currency.mainCurrency),
    chatMessages: await global.cache.isOnline() ? global.linesParsed - global.api.chatMessagesAtStart : 0,
    currentFollowers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
    currentViews: _.get(await global.db.engine.findOne('api.current', { key: 'views' }), 'value', 0),
    maxViewers: _.get(await global.db.engine.findOne('api.max', { key: 'viewers' }), 'value', 0),
    newChatters: _.get(await global.db.engine.findOne('api.new', { key: 'chatters' }), 'value', 0),
    game: _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', null),
    status: _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', null),
    rawStatus: await global.cache.rawStatus(),
    currentHosts: _.get(await global.db.engine.findOne('api.current', { key: 'hosts' }), 'value', 0),
    currentWatched: global.api._stream.watchedTime,
    tags: await global.db.engine.find('core.api.currentTags'),
  }
  socket.emit('stats', data)
}

module.exports = Panel
