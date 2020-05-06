'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { flatten } from './helpers/flatten';
import gitCommitInfo from 'git-commit-info';
import { adminEndpoint, publicEndpoint } from './helpers/socket';

import { info } from './helpers/log';
import { CacheTitles } from './database/entity/cacheTitles';
import { v4 as uuid} from 'uuid';
import { getConnection, getManager, getRepository, IsNull } from 'typeorm';
import { Dashboard, DashboardInterface, Widget } from './database/entity/dashboard';
import { Translation } from './database/entity/translation';
import { TwitchTag } from './database/entity/twitch';
import { User } from './database/entity/user';

import { default as socketSystem } from './socket';
import Parser from './parser';
import webhooks from './webhooks';
import general from './general';
import translateLib, { translate } from './translate';
import api, { currentStreamTags } from './api';
import tmi from './tmi';
import currency from './currency';
import oauth from './oauth';
import songs from './systems/songs';
import spotify from './integrations/spotify';
import { linesParsed, status as statusObj } from './helpers/parser';
import { list, systems } from './helpers/register';
import customvariables from './customvariables';
import highlights from './systems/highlights';
import _ from 'lodash';
import { getOwnerAsSender, getTime } from './commons';
import { app, ioServer, menu, menuPublic, server, setApp, setIOServer, setServer, widgets } from './helpers/panel';

const port = process.env.PORT ?? '20000';

export let socketsConnected = 0;

export type UIError = { name: string; message: string };

const errors: UIError[] = [];

export const addUIError = (error: UIError) => {
  errors.push(error);
};

export const init = () => {
  setApp(express());
  app?.use(bodyParser.json());
  app?.use(bodyParser.urlencoded({ extended: true }));
  setServer();
  setIOServer(server);

  // webhooks integration
  app?.post('/webhooks/hub/follows', (req, res) => {
    webhooks.follower(req.body);
    res.sendStatus(200);
  });
  app?.post('/webhooks/hub/streams', (req, res) => {
    webhooks.stream(req.body);
    res.sendStatus(200);
  });

  app?.get('/webhooks/hub/follows', (req, res) => {
    webhooks.challenge(req, res);
  });
  app?.get('/webhooks/hub/streams', (req, res) => {
    webhooks.challenge(req, res);
  });

  // highlights system
  app?.get('/highlights/:id', (req, res) => {
    highlights.url(req, res);
  });

  // customvariables system
  app?.get('/customvariables/:id', (req, res) => {
    customvariables.getURL(req, res);
  });
  app?.post('/customvariables/:id', (req, res) => {
    customvariables.postURL(req, res);
  });

  // static routing
  app?.use('/dist', express.static(path.join(__dirname, '..', 'public', 'dist')));
  app?.get('/popout/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'popout.html'));
  });
  app?.get('/oauth', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'oauth.html'));
  });
  app?.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
  });
  app?.get('/oauth/:page', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'oauth-' + req.params.page + '.html'));
  });
  app?.get('/overlays/:overlay', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'overlays.html'));
  });
  app?.get('/overlays/:overlay/:id', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'overlays.html'));
  });
  app?.get('/custom/:custom', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'custom', req.params.custom + '.html'));
  });
  app?.get('/public/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'public.html'));
  });
  app?.get('/fonts', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'fonts.json'));
  });
  app?.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'favicon.ico'));
  });
  app?.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  menu.push({ category: 'main', name: 'dashboard', id: 'dashboard' });

  setTimeout(() => {
    adminEndpoint('/', 'panel.sendStreamData', sendStreamData);
  }, 5000);

  ioServer?.use(socketSystem.authorize);

  ioServer?.on('connection', async (socket) => {
    socket.on('disconnect', () => {
      socketsConnected--;
    });
    socketsConnected++;

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
        .leftJoinAndSelect('twitch_tag_localization_name', 'names', `${joinQuery} like :tag`)
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
          .leftJoinAndSelect('twitch_tag_localization_name', 'names', `${joinQuery} = :tag`)
          .setParameter('tag', 'en-us');
        results = await query.execute();
      }
      cb(results);
    });
    // twitch game and title change
    socket.on('getGameFromTwitch', function (game) {
      api.sendGameFromTwitch(api, socket, game);
    });
    socket.on('getUserTwitchGames', async () => {
      const titles = await getRepository(CacheTitles).find();
      socket.emit('sendUserTwitchGamesAndTitles', titles) ;
    });
    socket.on('deleteUserTwitchGame', async (game) => {
      await getManager()
        .createQueryBuilder()
        .delete()
        .from(CacheTitles, 'titles')
        .where('game = :game', { game })
        .execute();
      const titles = await getRepository(CacheTitles).find();
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
      let allTitles = await getRepository(CacheTitles).find();
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
      allTitles = await getRepository(CacheTitles).find();
      for (const t of allTitles) {
        const titles = allTitles.filter(o => o.game === t.game && o.title === t.title);
        if (titles.length > 1) {
          // remove title if we have more than one title
          allTitles = allTitles.filter(o => String(o.id) !== String(t.id));
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
      const status = await api.setTitleAndGame(null, data);
      await api.setTags(null, data.tags);

      if (!status) { // twitch refused update
        cb(true);
      }

      data.title = data.title.trim();
      data.game = data.game.trim();

      const item = await getRepository(CacheTitles).findOne({
        game: data.game,
        title: data.title,
      });

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
      cb(null);
    });
    socket.on('joinBot', async () => {
      tmi.join('bot', tmi.channel);
    });
    socket.on('leaveBot', async () => {
      tmi.part('bot');
      // force all users offline
      await getRepository(User).update({}, { isOnline: false });
    });

    // custom var
    socket.on('custom.variable.value', async (variable, cb) => {
      let value = translate('webpanel.not-available');
      const isVariableSet = await customvariables.isVariableSet(variable);
      if (isVariableSet) {
        value = await customvariables.getValueOf(variable);
      }
      cb(null, value);
    });

    socket.on('responses.get', async function (at, callback) {
      const responses = flatten(!_.isNil(at) ? translateLib.translations[general.lang][at] : translateLib.translations[general.lang]);
      _.each(responses, function (value, key) {
        const _at = !_.isNil(at) ? at + '.' + key : key;
        responses[key] = {}; // remap to obj
        responses[key].default = translate(_at, true);
        responses[key].current = translate(_at);
      });
      callback(responses);
    });
    socket.on('responses.set', function (data) {
      _.remove(translateLib.custom, function (o: any) {
        return o.key === data.key;
      });
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
      _.remove(translateLib.custom, function (o: any) {
        return o.name === data.name;
      });
      await getRepository(Translation).delete({ name: data.name });
      callback(translate(data.name));
    });

    adminEndpoint('/', 'panel::errors', (cb) => {
      const errorsToShow: typeof errors  = [];
      do {
        const error = errors.shift();
        if (!error) {
          break;
        }

        if (!errorsToShow.find((o) => {
          return o.name === error.name && o.message === error.message;
        })) {
          errorsToShow.push(error);
        }
      } while (errors.length > 0);
      cb(null, errorsToShow);
    });

    adminEndpoint('/', 'panel::availableWidgets', async (userId: number, type: DashboardInterface['type'], cb) => {
      const dashboards = await getRepository(Dashboard).find({
        where: {
          userId, type,
        },
        relations: ['widgets'],
        order: {
          createdAt: 'ASC',
        },
      });

      const sendWidgets: typeof widgets = [];
      const dashWidgets = dashboards.map(o => o.widgets).flat();
      for(const widget of widgets) {
        if (!dashWidgets.find(o => o.name === widget.id)) {
          sendWidgets.push(widget);
        }
      }
      cb(null, sendWidgets);
    });

    adminEndpoint('/', 'panel::dashboards', async (userId: number, type: DashboardInterface['type'], cb) => {
      getRepository(Widget).delete({ dashboardId: IsNull() });
      const dashboards = await getRepository(Dashboard).find({
        where: { userId, type },
        relations: ['widgets'],
        order: { createdAt: 'ASC' },
      });
      cb(null, dashboards);
    });

    adminEndpoint('/', 'panel::dashboards::remove', async (userId: number, type: DashboardInterface['type'], id: string, cb) => {
      await getRepository(Dashboard).delete({ userId, type, id });
      await getRepository(Widget).delete({ dashboardId: IsNull() });
      cb(null);
    });

    adminEndpoint('/', 'panel::dashboards::create', async (userId: number, name: string, cb) => {
      cb(null, await getRepository(Dashboard).save({ name, createdAt: Date.now(), id: uuid(), userId, type: 'admin' }));
    });

    socket.on('addWidget', async function (widgetName, id, cb) {
      // add widget to bottom left
      const dashboard = await getRepository(Dashboard).findOne({
        relations: ['widgets'],
        where: { id } ,
      });
      if (dashboard) {
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
      } else {
        cb(undefined);
      }
    });

    adminEndpoint('/', 'panel::dashboards::save', async (dashboards) => {
      await getRepository(Dashboard).save(dashboards);
      await getRepository(Widget).delete({ dashboardId: IsNull() });
    });

    socket.on('connection_status', cb => {
      cb(statusObj);
    });
    socket.on('saveConfiguration', function (data) {
      _.each(data, async function (index, value) {
        if (value.startsWith('_')) {
          return true;
        }
        general.setValue({ sender: getOwnerAsSender(), createdAt: 0, command: '', parameters: value + ' ' + index, attr: { quiet: data._quiet }});
      });
    });

    // send enabled systems
    socket.on('systems', async (cb) => {
      const toEmit: { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean }[] = [];
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
      const toEmit: { name: string }[] = [];
      for (const system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch', 'socket']) {
        toEmit.push({
          name: system.toLowerCase(),
        });
      };
      cb(null, toEmit);
    });
    socket.on('integrations', async (cb) => {
      const toEmit: { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean }[] = [];
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
      const toEmit: { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean }[] = [];
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
      const toEmit: { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean }[] = [];
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
    });
    socket.on('version', function (cb) {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z');
      cb(version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'));
    });

    socket.on('parser.isRegistered', function (data) {
      socket.emit(data.emit, { isRegistered: new Parser().find(data.command) });
    });

    adminEndpoint('/', 'menu', (cb) => {
      cb(menu);
    });

    publicEndpoint('/', 'menu::public', (cb) => {
      cb(menuPublic);
    });

    socket.on('translations', (cb) => {
      const lang = {};
      _.merge(
        lang,
        translate({ root: 'webpanel' }),
        translate({ root: 'ui' }) // add ui root -> slowly refactoring to new name
      );
      cb(lang);
    });

    // send webpanel translations
    const lang = {};
    _.merge(
      lang,
      translate({ root: 'webpanel' }),
      translate({ root: 'ui' }) // add ui root -> slowly refactoring to new name
    );
    socket.emit('lang', lang);
  });
};

export const getServer = function () {
  return server;
};

export const getApp = function () {
  return app;
};

export const expose = function () {
  server.listen(port, () => {
    info(`WebPanel is available at http://localhost:${port}`);
  });
};

const sendStreamData = async function (cb) {
  try {
    const ytCurrentSong = Object.values(songs.isPlaying).find(o => o) ? _.get(JSON.parse(songs.currentSong), 'title', null) : null;
    let spotifyCurrentSong: null | string = _.get(JSON.parse(spotify.currentSong), 'song', '') + ' - ' + _.get(JSON.parse(spotify.currentSong), 'artist', '');
    if (spotifyCurrentSong.trim().length === 1 /* '-' */  || !_.get(JSON.parse(spotify.currentSong), 'is_playing', false)) {
      spotifyCurrentSong = null;
    }

    const data = {
      broadcasterType: oauth.broadcasterType,
      uptime: getTime(api.isStreamOnline ? api.streamStatusChangeSince : null, false),
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
      tags: currentStreamTags,
    };
    cb(null, data);
  } catch (e) {
    cb(e.stack, undefined);
  }
};
