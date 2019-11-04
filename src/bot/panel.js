'use strict'

var express = require('express')
const bodyParser = require('body-parser')
var http = require('http')
var path = require('path')
var _ = require('lodash')
const util = require('util')
const commons = require('./commons')
const flatten = require('./helpers/flatten')
const gitCommitInfo = require('git-commit-info');

import { error, info } from './helpers/log';
import { CacheTitles } from './entity/cacheTitles';
import uuid from 'uuid'
import { getManager } from 'typeorm'

const Parser = require('./parser')

const config = require('@config')

let app;
let server;

function Panel () {
  // setup static server
  app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  server = http.createServer(app)
  this.port = process.env.PORT ?? config.panel.port;

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

  // customvariables system
  app.get('/customvariables/:id', (req, res) => {
    global.customvariables.getURL(req, res)
  })
  app.post('/customvariables/:id', (req, res) => {
    global.customvariables.postURL(req, res)
  })

  // static routing
  app.use('/dist', express.static(path.join(__dirname, '..', 'public', 'dist')))
  app.get('/popout/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'popout.html'))
  })
  app.get('/oauth', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'oauth.html'))
  })
  app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'))
  })
  app.get('/oauth/:page', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'oauth-' + req.params.page + '.html'))
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
  app.get('/public/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'public.html'))
  })
  app.get('/fonts', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'fonts.json'))
  })
  app.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.ico'))
  })
  app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })

  this.io = require('socket.io')(server)
  this.menu = [{ category: 'main', name: 'dashboard', id: 'dashboard' }]
  this.widgets = []
  this.socketListeners = []

  this.registerSockets({
    self: this,
    expose: ['sendStreamData'],
    finally: null
  })

  this.io.use(global.socket.authorize);

  var self = this
  this.io.on('connection', function (socket) {
    // check auth
    socket.on('metrics.translations', function (key) { global.lib.translate.addMetrics(key, true) })
    socket.on('getCachedTags', async (cb) => {
      cb(await global.db.engine.find('core.api.tags'))
    })
    // twitch game and title change
    socket.on('getGameFromTwitch', function (game) { global.api.sendGameFromTwitch(global.api, socket, game) })
    socket.on('getUserTwitchGames', async () => {
      const titles = await getManager()
        .createQueryBuilder()
        .select('titles')
        .from(CacheTitles, 'titles')
        .getMany();
      socket.emit('sendUserTwitchGamesAndTitles', titles) ;
    })
    socket.on('deleteUserTwitchGame', async (game) => {
      await getManager()
        .createQueryBuilder()
        .delete()
        .from(CacheTitles, 'titles')
        .where('game = :game', { game })
        .execute();
      const titles = await getManager()
        .createQueryBuilder()
        .select('titles')
        .from(CacheTitles, 'titles')
        .getMany();
      socket.emit('sendUserTwitchGamesAndTitles', titles);
    });
    socket.on('cleanupGameAndTitle', async (data, cb) => {
      // remove empty titles
      await getManager()
        .createQueryBuilder()
        .delete()
        .from(CacheTitles, 'titles')
        .where('title = :title', { title: '' })
        .execute();

      // update titles
      const updateTitles = data.titles.filter(o => o.title.trim().length > 0);
      for (const t of updateTitles) {
        if (t.title === data.title && t.game === data.game) {
          await getManager()
            .createQueryBuilder()
            .update(CacheTitles)
            .set({ timestamp: Date.now(), title: t.title })
            .where('id = :id', { id: t.id })
            .execute();
        } else {
          await getManager()
            .createQueryBuilder()
            .update(CacheTitles)
            .set({ title: t.title })
            .where('id = :id', { id: t.id })
            .execute();
        }
      }

      // remove removed titles
      let allTitles = await getManager()
        .createQueryBuilder()
        .select('titles')
        .from(CacheTitles, 'titles')
        .getMany();
      for (const t of allTitles) {
        const titles = updateTitles.filter(o => o.game === t.game && o.title === t.title);
        if (titles.length === 0) {
          if (t.game !== data.game || t.title !== data.title) { // don't remove current/new title
            await getManager()
              .createQueryBuilder()
              .delete()
              .from(CacheTitles, 'titles')
              .where('id = :id', { id: t.id })
              .execute();
          }
        }
      }

      // remove duplicates
      allTitles = await getManager()
        .createQueryBuilder()
        .select('titles')
        .from(CacheTitles, 'titles')
        .getMany();
      for (const t of allTitles) {
        const titles = allTitles.filter(o => o.game === t.game && o.title === t.title);
        if (titles.length > 1) {
          // remove title if we have more than one title
          allTitles = allTitles.filter(o => String(o._id) !== String(t._id));
          await getManager()
            .createQueryBuilder()
            .delete()
            .from(CacheTitles, 'titles')
            .where('id = :id', { id: t.id })
            .execute();
        }
      }
      cb(null, allTitles);
    });
    socket.on('updateGameAndTitle', async (data, cb) => {
      const status = await global.api.setTitleAndGame(null, data)
      await global.api.setTags(null, data.tags);

      if (!status) { // twitch refused update
        cb(true);
      }

      data.title = data.title.trim();
      data.game = data.game.trim();

      const item = await getManager()
        .createQueryBuilder()
        .select('titles')
        .from(CacheTitles, 'titles')
        .where('game = :game', { game: data.game })
        .andWhere('title = :title', { title: data.title })
        .getOne();

      if (!item) {
        await getManager()
          .createQueryBuilder()
          .insert()
          .into(CacheTitles)
          .values([
            { game: data.game, title: data.title, timestamp: Date.now() },
          ])
          .execute();
      }

      self.sendStreamData(self, global.panel.io) // force dashboard update
      cb(null)
    })
    socket.on('joinBot', async () => {
      global.tmi.join('bot', global.tmi.channel)
    })
    socket.on('leaveBot', async () => {
      global.tmi.part('bot')
      // force all users offline
      await getManager()
        .createQueryBuilder()
        .delete()
        .from(UsersOnline)
        .execute();
    })

    // custom var
    socket.on('custom.variable.value', async (variable, cb) => {
      let value = global.translate('webpanel.not-available')
      let isVariableSet = await global.customvariables.isVariableSet(variable)
      if (isVariableSet) value = await global.customvariables.getValueOf(variable)
      cb(null, value)
    })

    socket.on('responses.get', async function (at, callback) {
      const responses = flatten.flatten(!_.isNil(at) ? global.lib.translate.translations[global.general.lang][at] : global.lib.translate.translations[global.general.lang])
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
      cb(await global.db.engine.insert('dashboards', { name, createdAt: Date.now(), id: uuid() }))
    })

    socket.on('removeDashboard', async (id) => {
      await global.db.engine.remove('dashboards', { id })
      await global.db.engine.remove('widgets', { dashboardId: id })
    })

    socket.on('addWidget', async function (widget, dashboardId, cb) {
      cb(await self.addWidgetToDb(self, widget, dashboardId, socket));
    })
    socket.on('updateWidgets', function (widgets) { self.updateWidgetsInDb(self, widgets, socket) })
    socket.on('connection_status', cb => { cb(global.status) });
    socket.on('saveConfiguration', function (data) {
      _.each(data, async function (index, value) {
        if (value.startsWith('_')) return true
        global.general.setValue({ sender: { username: commons.getOwner() }, parameters: value + ' ' + index, quiet: data._quiet })
      })
    })

    // send enabled systems
    socket.on('systems', async (cb) => {
      let toEmit = []
      for (let system of Object.keys(global.systems).filter(o => !o.startsWith('_'))) {
        toEmit.push({
          name: system.toLowerCase(),
          enabled: global.systems[system].enabled,
          areDependenciesEnabled: await global.systems[system].areDependenciesEnabled,
          isDisabledByEnv: global.systems[system].isDisabledByEnv,
        })
      }
      cb(null, toEmit)
    })
    socket.on('core', async (cb) => {
      let toEmit = []
      for (let system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch', 'socket']) {
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
          areDependenciesEnabled: await global.integrations[system].areDependenciesEnabled,
          isDisabledByEnv: global.integrations[system].isDisabledByEnv,
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
          areDependenciesEnabled: await global.overlays[system].areDependenciesEnabled,
          isDisabledByEnv: global.overlays[system].isDisabledByEnv,
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
          areDependenciesEnabled: await global.games[system].areDependenciesEnabled,
          isDisabledByEnv: global.games[system].isDisabledByEnv,
        })
      }
      cb(null, toEmit)
    })

    socket.on('name', function (cb) {
      cb(global.oauth.botUsername);
    })
    socket.on('version', function (cb) {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z');
      cb(version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'));
    })

    socket.on('parser.isRegistered', function (data) {
      socket.emit(data.emit, { isRegistered: new Parser().find(data.command) })
    })

    socket.on('menu', (cb) => {
      cb(self.menu);
    });

    socket.on('translations', (cb) => {
      let lang = {}
      _.merge(
        lang,
        global.translate({ root: 'webpanel' }),
        global.translate({ root: 'ui' }) // add ui root -> slowly refactoring to new name
      )
      cb(lang);
    })

    _.each(self.socketListeners, function (listener) {
      socket.on(listener.on, async function (data) {
        if (typeof listener.fnc !== 'function') {
          throw new Error('Function for this listener is undefined' +
            ' widget=' + listener.self.constructor.name + ' on=' + listener.on)
        }
        try { await listener.fnc(listener.self, self.io, data) } catch (e) {
          error('Error on ' + listener.on + ' listener')
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

Panel.prototype.getServer = function () {
  return server;
}

Panel.prototype.getApp = function () {
  return app;
}

Panel.prototype.expose = function () {
  server.listen(global.panel.port, function () {
    info(`WebPanel is available at http://localhost:${global.panel.port}`)
  })
}

Panel.prototype.addMenu = function (menu) {
  if (!this.menu.find(o => o.id === menu.id)) {
    this.menu.push(menu);
  }
}

Panel.prototype.addWidget = function (id, name, icon) { this.widgets.push({ id: id, name: name, icon: icon }) }


Panel.prototype.updateWidgetsInDb = async function (self, widgets, socket) {
  await global.db.engine.remove('widgets', {}) // remove widgets
  for (let widget of widgets) {
    global.db.engine.update('widgets', { id: widget.id }, { id: widget.id, dashboardId: widget.dashboardId, position: { x: widget.position.x, y: widget.position.y }, size: { width: widget.size.width, height: widget.size.height } })
  }
}

Panel.prototype.addWidgetToDb = async function (self, widget, dashboardId, socket) {
  // add widget to bottom left
  const widgets = await global.db.engine.find('widgets', { dashboardId });
  let y = 0;
  for (const widget of widgets) {
    y = Math.max(y, widget.position.y + widget.size.height);
  }
 return (await global.db.engine.update('widgets', { id: widget }, { dashboardId, id: widget, position: { x: 0, y }, size: { width: 4, height: 3 } }))
}

Panel.prototype.socketListening = function (self, on, fnc) {
  this.socketListeners.push({ self: self, on: on, fnc: fnc })
}

Panel.prototype.registerSockets = util.deprecate(function (options) {
  const name = options.self.constructor.name.toLowerCase()
  for (let fnc of options.expose) {
    if (!_.isFunction(options.self[fnc])) error(`Function ${fnc} of ${options.self.constructor.name} is undefined`)
    else this.socketListeners.push({ self: options.self, on: `${name}.${fnc}`, fnc: options.self[fnc], finally: options.finally })
  }
}, 'registerSockets() is deprecated. Use socket from system interface directly.')

Panel.prototype.sendStreamData = async function (self, socket) {
  try {
    if (typeof global.systems === 'undefined'
        || typeof global.systems.songs === 'undefined'
        || typeof global.integrations === 'undefined'
        || typeof global.integrations.spotify === 'undefined') {
      return
    }

    const ytCurrentSong = Object.values(global.systems.songs.isPlaying).find(o => o) ? _.get(JSON.parse(global.systems.songs.currentSong), 'title', null) : null;
    let spotifyCurrentSong = _.get(JSON.parse(global.integrations.spotify.currentSong), 'song', '') + ' - ' + _.get(JSON.parse(global.integrations.spotify.currentSong), 'artist', '');
    if (spotifyCurrentSong.trim().length === 1 /* '-' */  || !_.get(JSON.parse(global.integrations.spotify.currentSong), 'is_playing', false)) {
      spotifyCurrentSong = null;
    }

    var data = {
      broadcasterType: global.oauth.broadcasterType,
      uptime: commons.getTime(global.api.isStreamOnline ? global.api.streamStatusChangeSince : null, false),
      currentViewers: global.api.stats.currentViewers,
      currentSubscribers: global.api.stats.currentSubscribers,
      currentBits: global.api.stats.currentBits,
      currentTips: global.api.stats.currentTips,
      currency: global.currency.symbol(global.currency.mainCurrency),
      chatMessages: global.api.isStreamOnline ? global.linesParsed - global.api.chatMessagesAtStart : 0,
      currentFollowers: global.api.stats.currentFollowers,
      currentViews: global.api.stats.currentViews,
      maxViewers: global.api.stats.maxViewers,
      newChatters: global.api.stats.newChatters,
      game: global.api.stats.currentGame,
      status: global.api.stats.currentTitle,
      rawStatus: global.api.rawStatus,
      currentSong: ytCurrentSong || spotifyCurrentSong || global.translate('songs.not-playing'),
      currentHosts: global.api.stats.currentHosts,
      currentWatched: global.api.stats.currentWatchedTime,
      tags: await global.db.engine.find('core.api.currentTags'),
    }
    socket.emit('stats', data)
  } catch (e) {
    error(e.stack);
  }
}

module.exports = Panel
