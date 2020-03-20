'use strict'

var express = require('express')
const bodyParser = require('body-parser')
var http = require('http')
var path = require('path')
var _ = require('lodash')
const commons = require('./commons')
const { flatten } = require('./helpers/flatten')
const gitCommitInfo = require('git-commit-info');
import { adminEndpoint } from './helpers/socket';

import { info } from './helpers/log';
import { CacheTitles } from './database/entity/cacheTitles';
import { v4 as uuid} from 'uuid';
import { getConnection, getManager, getRepository } from 'typeorm';
import { Dashboard, Widget } from './database/entity/dashboard';
import { Translation } from './database/entity/translation'
import { TwitchTag, TwitchTagLocalizationName } from './database/entity/twitch'

import socket from './socket';
import Parser from './parser';
import webhooks from './webhooks';
import general from './general';
import translateLib, { translate } from './translate';
import api from './api';
import tmi from './tmi';
import currency from './currency';
import oauth from './oauth';
import songs from './systems/songs';
import spotify from './integrations/spotify';
import { linesParsed, status as statusObj } from './helpers/parser';
import { systems, list } from './helpers/register'
import customvariables from './customvariables';

let app;
let server;

export let socketsConnected = 0;

function Panel () {
  // setup static server
  app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  server = http.createServer(app)
  this.port = process.env.PORT ?? '20000';

  // webhooks integration
  app.post('/webhooks/hub/follows', (req, res) => {
    webhooks.follower(req.body)
    res.sendStatus(200)
  })
  app.post('/webhooks/hub/streams', (req, res) => {
    webhooks.stream(req.body)
    res.sendStatus(200)
  })

  app.get('/webhooks/hub/follows', (req, res) => {
    webhooks.challenge(req, res)
  })
  app.get('/webhooks/hub/streams', (req, res) => {
    webhooks.challenge(req, res)
  })

  // highlights system
  app.get('/highlights/:id', (req, res) => {
    highlights.url(req, res)
  })

  // customvariables system
  app.get('/customvariables/:id', (req, res) => {
    customvariables.getURL(req, res)
  })
  app.post('/customvariables/:id', (req, res) => {
    customvariables.postURL(req, res)
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

  setTimeout(() => {
    adminEndpoint('/', 'panel.sendStreamData', this.sendStreamData);
  }, 5000)

  this.io.use(socket.authorize);

  this.io.on('connection', async (socket) => {
    var self = this
    socket.on('disconnect', () => {
      socketsConnected--;
    });
    socketsConnected++;
    // create main dashboard if needed;
    await getRepository(Dashboard).save({
      id: 'c287b750-b620-4017-8b3e-e48757ddaa83', // constant ID
      name: 'Main',
      createdAt: 0,
    })

    socket.on('getCachedTags', async (cb) => {
      const connection = await getConnection();
      const joinQuery = connection.options.type === 'postgres' ? '"names"."tagId" = "tag_id" AND "names"."locale"' : 'names.tagId = tag_id AND names.locale';
      let query = getRepository(TwitchTag)
        .createQueryBuilder('tags')
        .select('names.locale', 'locale')
        .addSelect('names.value', 'value')
        .addSelect('tags.tag_id', 'tag_id')
        .addSelect('tags.is_auto', 'is_auto')
        .addSelect('tags.is_current', 'is_current')
        .leftJoinAndSelect(TwitchTagLocalizationName, 'names', `${joinQuery} like :tag`)
        .setParameter('tag', '%' + general.lang +'%');

      let results = await query.execute();
      if (results.length > 0) {
        cb(results);
      } else {
        // if we don';t have results with our selected locale => reload with en-us
        query = getRepository(TwitchTag)
          .createQueryBuilder('tags')
          .select('names.locale', 'locale')
          .addSelect('names.value', 'value')
          .addSelect('tags.tag_id', 'tag_id')
          .addSelect('tags.is_auto', 'is_auto')
          .addSelect('tags.is_current', 'is_current')
          .leftJoinAndSelect(TwitchTagLocalizationName, 'names', `${joinQuery} = :tag`)
          .setParameter('tag', 'en-us');
        results = await query.execute();
      }
      cb(results);
    });
    // twitch game and title change
    socket.on('getGameFromTwitch', function (game) { api.sendGameFromTwitch(api, socket, game) })
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
      const status = await api.setTitleAndGame(null, data)
      await api.setTags(null, data.tags);

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
      cb(null)
    })
    socket.on('joinBot', async () => {
      tmi.join('bot', tmi.channel)
    })
    socket.on('leaveBot', async () => {
      tmi.part('bot')
      // force all users offline
      await getRepository(User).update({}, { isOnline: false });
    })

    // custom var
    socket.on('custom.variable.value', async (variable, cb) => {
      let value = translate('webpanel.not-available')
      let isVariableSet = await customvariables.isVariableSet(variable)
      if (isVariableSet) value = await customvariables.getValueOf(variable)
      cb(null, value)
    })

    socket.on('responses.get', async function (at, callback) {
      const responses = flatten(!_.isNil(at) ? translateLib.translations[general.lang][at] : translateLib.translations[general.lang])
      _.each(responses, function (value, key) {
        let _at = !_.isNil(at) ? at + '.' + key : key
        responses[key] = {} // remap to obj
        responses[key].default = translate(_at, true)
        responses[key].current = translate(_at)
      })
      callback(responses)
    })
    socket.on('responses.set', function (data) {
      _.remove(translateLib.custom, function (o) { return o.key === data.key });
      translateLib.custom.push(data);
      translateLib._save();

      const lang = {};
      _.merge(
        lang,
        translate({ root: 'webpanel' }),
        translate({ root: 'ui' }), // add ui root -> slowly refactoring to new name
      );
      socket.emit('lang', lang);
    });
    socket.on('responses.revert', async function (data, callback) {
      _.remove(translateLib.custom, function (o) { return o.name === data.name });
      await getRepository(Translation).delete({ name: data.name });
      callback(translate(data.name));
    });

    socket.on('getWidgetList', async (cb) => {
      const dashboards = await getRepository(Dashboard).find({
        relations: ['widgets'],
      });
      let widgetList = [];
      for (const dashboard of dashboards) {
        widgetList = [
          ...widgetList,
          ...dashboard.widgets.map(o => o.name),
        ];
      }

      const sendWidgets = [];
      for(const widget of this.widgets) {
        if (!widgetList.includes(widget.id)) {
          sendWidgets.push(widget);
        }
      }
      cb(sendWidgets, dashboards);
    });

    socket.on('getWidgets', async (cb) => {
      const dashboards = await getRepository(Dashboard).find({
        relations: ['widgets'],
        order: {
          createdAt: 'ASC',
        },
      });
      cb(dashboards);
    });

    socket.on('createDashboard', async (name, cb) => {
      cb(await getRepository(Dashboard).save({ name, createdAt: Date.now(), id: uuid() }));
    });

    socket.on('removeDashboard', async (id) => {
      if (id !== 'c287b750-b620-4017-8b3e-e48757ddaa83') {
        await getRepository(Widget).delete({ dashboardId: id });
        await getRepository(Dashboard).delete({ id });
      }
    });

    socket.on('addWidget', async function (widgetName, id, cb) {
      // add widget to bottom left
      const dashboard = await getRepository(Dashboard).findOne({
        relations: ['widgets'],
        where: { id } ,
      });
      let y = 0;
      for (const w of dashboard.widgets) {
        y = Math.max(y, w.positionY + w.height);
      }
      dashboard.widgets.push({
        name: widgetName,
        positionX: 0,
        positionY: y,
        width: 4,
        height: 3,
      });
      cb(await getRepository(Dashboard).save(dashboard));
    })
    socket.on('updateWidgets', async (dashboards) => {
      await getRepository(Dashboard).save(dashboards);
    });
    socket.on('connection_status', cb => { cb(statusObj) });
    socket.on('saveConfiguration', function (data) {
      _.each(data, async function (index, value) {
        if (value.startsWith('_')) return true
        general.setValue({ sender: { username: commons.getOwner() }, parameters: value + ' ' + index, quiet: data._quiet })
      })
    })

    // send enabled systems
    socket.on('systems', async (cb) => {
      const toEmit = [];
      for (const system of systems) {
        toEmit.push({
          name: system.__moduleName__.toLowerCase(),
          enabled: system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv: system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });
    socket.on('core', async (cb) => {
      const toEmit = [];
      for (const system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch', 'socket']) {
        toEmit.push({
          name: system.toLowerCase()
        });
      };
      cb(null, toEmit);
    })
    socket.on('integrations', async (cb) => {
      const toEmit = [];
      for (const system of list('integrations')) {
        if (!system.showInUI) {
          continue;
        }
        toEmit.push({
          name: system.__moduleName__.toLowerCase(),
          enabled: system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv: system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });
    socket.on('overlays', async (cb) => {
      const toEmit = [];
      for (const system of list('overlays')) {
        if (!system.showInUI) {
          continue;
        }
        toEmit.push({
          name: system.__moduleName__.toLowerCase(),
          enabled: system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv: system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });
    socket.on('games', async (cb) => {
      const toEmit = [];
      for (const system of list('games')) {
        if (!system.showInUI) {
          continue;
        }
        toEmit.push({
          name: system.__moduleName__.toLowerCase(),
          enabled: system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv: system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });

    socket.on('name', function (cb) {
      cb(oauth.botUsername);
    })
    socket.on('version', function (cb) {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z');
      cb(version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'));
    })

    socket.on('parser.isRegistered', function (data) {
      socket.emit(data.emit, { isRegistered: new Parser().find(data.command) })
    })

    socket.on('menu', (cb) => {
      cb(this.menu);
    });

    socket.on('translations', (cb) => {
      let lang = {}
      _.merge(
        lang,
        translate({ root: 'webpanel' }),
        translate({ root: 'ui' }) // add ui root -> slowly refactoring to new name
      )
      cb(lang);
    })

    // send webpanel translations
    let lang = {}
    _.merge(
      lang,
      translate({ root: 'webpanel' }),
      translate({ root: 'ui' }) // add ui root -> slowly refactoring to new name
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
  server.listen(this.port, () => {
    info(`WebPanel is available at http://localhost:${this.port}`)
  });
};

Panel.prototype.addMenu = function (menu) {
  if (!this.menu.find(o => o.id === menu.id)) {
    this.menu.push(menu);
  }
}

Panel.prototype.addWidget = function (id, name, icon) { this.widgets.push({ id: id, name: name, icon: icon }) }

Panel.prototype.sendStreamData = async function (cb) {
  try {
    const ytCurrentSong = Object.values(songs.isPlaying).find(o => o) ? _.get(JSON.parse(songs.currentSong), 'title', null) : null;
    let spotifyCurrentSong = _.get(JSON.parse(spotify.currentSong), 'song', '') + ' - ' + _.get(JSON.parse(spotify.currentSong), 'artist', '');
    if (spotifyCurrentSong.trim().length === 1 /* '-' */  || !_.get(JSON.parse(spotify.currentSong), 'is_playing', false)) {
      spotifyCurrentSong = null;
    }

    const connection = await getConnection();
    const joinQuery = connection.options.type === 'postgres' ? '"names"."tagId" = "tag_id" AND "names"."locale"' : 'names.tagId = tag_id AND names.locale';
    let tagQuery = getRepository(TwitchTag)
      .createQueryBuilder('tags')
      .select('names.locale', 'locale')
      .addSelect('names.value', 'value')
      .addSelect('tags.tag_id', 'tag_id')
      .addSelect('tags.is_auto', 'is_auto')
      .addSelect('tags.is_current', 'is_current')
      .where('tags.is_current = True')
      .leftJoinAndSelect(TwitchTagLocalizationName, 'names', `${joinQuery} like :tag`)
      .setParameter('tag', '%' + general.lang +'%');

    let tagResults = await tagQuery.execute();
    if (tagResults.length === 0) {
      // if we don';t have results with our selected locale => reload with en-us
      tagQuery = getRepository(TwitchTag)
        .createQueryBuilder('tags')
        .select('names.locale', 'locale')
        .addSelect('names.value', 'value')
        .addSelect('tags.tag_id', 'tag_id')
        .addSelect('tags.is_auto', 'is_auto')
        .addSelect('tags.is_current', 'is_current')
        .where('tags.is_current = True')
        .leftJoinAndSelect(TwitchTagLocalizationName, 'names', `${joinQuery} = :tag`)
        .setParameter('tag', 'en-us');
      tagResults = await tagQuery.execute();
    }

    const data = {
      broadcasterType: oauth.broadcasterType,
      uptime: commons.getTime(api.isStreamOnline ? api.streamStatusChangeSince : null, false),
      currentViewers: api.stats.currentViewers,
      currentSubscribers: api.stats.currentSubscribers,
      currentBits: api.stats.currentBits,
      currentTips: api.stats.currentTips,
      currency: currency.symbol(currency.mainCurrency),
      chatMessages: api.isStreamOnline ? linesParsed - api.chatMessagesAtStart : 0,
      currentFollowers: api.stats.currentFollowers,
      currentViews: api.stats.currentViews,
      maxViewers: api.stats.maxViewers,
      newChatters: api.stats.newChatters,
      game: api.stats.currentGame,
      status: api.stats.currentTitle,
      rawStatus: api.rawStatus,
      currentSong: ytCurrentSong || spotifyCurrentSong || translate('songs.not-playing'),
      currentHosts: api.stats.currentHosts,
      currentWatched: api.stats.currentWatchedTime,
      tags: tagResults,
    }
    cb(null, data)
  } catch (e) {
    cb(e.stack, data);
  }
}

export default new Panel();
