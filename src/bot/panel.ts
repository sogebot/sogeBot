'use strict';

import fs from 'fs';
import path from 'path';

import bodyParser from 'body-parser';
import express from 'express';
import RateLimit from 'express-rate-limit';
import gitCommitInfo from 'git-commit-info';
import _, { isEqual } from 'lodash';
import sanitize from 'sanitize-filename';
import {
  getConnection, getManager, getRepository, IsNull,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { CacheTitles, CacheTitlesInterface } from './database/entity/cacheTitles';
import {
  Dashboard, DashboardInterface, Widget,
} from './database/entity/dashboard';
import { Translation } from './database/entity/translation';
import { TwitchTag, TwitchTagInterface } from './database/entity/twitch';
import { User } from './database/entity/user';
import {
  chatMessagesAtStart, currentStreamTags, isStreamOnline, rawStatus, stats, streamStatusChangeSince,
} from './helpers/api';
import { getOwnerAsSender } from './helpers/commons/getOwnerAsSender';
import {
  getURL, getValueOf, isVariableSet, postURL,
} from './helpers/customvariables';
import { getIsBotStarted } from './helpers/database';
import { flatten } from './helpers/flatten';
import { setValue } from './helpers/general';
import { getLang } from './helpers/locales';
import {
  getDEBUG, info, setDEBUG,
} from './helpers/log';
import {
  app, ioServer, menu, menuPublic, server, serverSecure, setApp, setServer, widgets,
} from './helpers/panel';
import { socketsConnectedDec, socketsConnectedInc } from './helpers/panel/';
import { errors, warns } from './helpers/panel/alerts';
import { linesParsed, status as statusObj } from './helpers/parser';
import { list, systems } from './helpers/register';
import { adminEndpoint, publicEndpoint } from './helpers/socket';
import lastfm from './integrations/lastfm';
import spotify from './integrations/spotify';
import { sendGameFromTwitch } from './microservices/sendGameFromTwitch';
import { setTags } from './microservices/setTags';
import { setTitleAndGame } from './microservices/setTitleAndGame';
import oauth from './oauth';
import Parser from './parser';
import { default as socketSystem } from './socket';
import highlights from './systems/highlights';
import songs from './systems/songs';
import tmi from './tmi';
import translateLib, { translate } from './translate';

const port = process.env.PORT ?? '20000';
const secureport = process.env.SECUREPORT ?? '20443';

const limiter = RateLimit({
  windowMs:     5 * 60 * 1000,
  max:          100,
  message:      'Too many requests from this IP, please try again after several minutes.',
  keyGenerator: (req, res) => {
    return req.ip + req.url;
  },
});

export const init = () => {
  setApp(express());
  app?.use(limiter);
  app?.use(bodyParser.json());
  app?.use(bodyParser.urlencoded({ extended: true }));
  setServer();

  // highlights system
  app?.get('/highlights/:id', (req, res) => {
    highlights.url(req, res);
  });

  // customvariables system
  app?.get('/health', (req, res) => {
    if (getIsBotStarted()) {
      res.status(200).send('OK');
    } else {
      res.status(503).send('Not OK');
    }
  });

  // customvariables system
  app?.get('/customvariables/:id', (req, res) => {
    getURL(req, res);
  });
  app?.post('/customvariables/:id', (req, res) => {
    postURL(req, res);
  });

  // static routing
  app?.use('/dist', express.static(path.join(__dirname, '..', 'public', 'dist')));

  const nuxtCache = new Map<string, string>();
  app?.get('/_nuxt/*', (req, res) => {
    if (!nuxtCache.get(req.url)) {
      // search through node_modules to find correct nuxt file
      const paths = [
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-oauth', 'dist', '_nuxt'),
      ];
      for (const dir of paths) {
        const pathToFile = path.join(dir, req.url.replace('_nuxt', ''));
        if (fs.existsSync(pathToFile)) {
          nuxtCache.set(req.url, pathToFile);
        }
      }
    }
    res.sendFile(nuxtCache.get(req.url) as string);
  });
  app?.get('/dist/*/*.js', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', (req.url + '.gz').split('/').map(o => sanitize(o)).join('/')), {
      headers: {
        'Content-Type':     'text/javascript',
        'Content-Encoding': 'gzip',
        'Cache-Control':    'public',
      },
    });
  });
  app?.get('/dist/*/*.map', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', (req.url + '.gz').split('/').map(o => sanitize(o)).join('/')), {
      headers: {
        'Content-Type':     'text/javascript',
        'Content-Encoding': 'gzip',
        'Cache-Control':    'public',
      },
    });
  });
  app?.get('/dist/*/*.css', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', (req.url + '.gz').split('/').map(o => sanitize(o)).join('/')), {
      headers: {
        'Content-Type':     'text/css',
        'Content-Encoding': 'gzip',
        'Cache-Control':    'public',
      },
    });
  });
  app?.get('/popout/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'popout.html'));
  });
  app?.get('/oauth/:page?', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-oauth', 'dist', 'oauth', 'index.html'));
  });
  app?.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-oauth', 'dist', 'login', 'index.html'));
  });
  app?.get('/overlays/:overlay', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'overlays.html'));
  });
  app?.get('/overlays/:overlay/:id', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'overlays.html'));
  });
  app?.get('/custom/:custom', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'custom', sanitize(req.params.custom) + '.html'));
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

  menu.push({
    category: 'main', name: 'dashboard', id: 'dashboard', this: null,
  });

  setTimeout(() => {
    adminEndpoint('/', 'panel::resetStatsState', () => lastDataSent = null);
  }, 5000);

  ioServer?.use(socketSystem.authorize);

  ioServer?.on('connect', async (socket) => {
    socket.on('disconnect', () => {
      socketsConnectedDec();
    });
    socketsConnectedInc();

    socket.on('getCachedTags', async (cb: (results: TwitchTagInterface[]) => void) => {
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
        .setParameter('tag', '%' + getLang() +'%');

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
    socket.on('getGameFromTwitch', function (game: string) {
      sendGameFromTwitch(socket, game);
    });
    socket.on('getUserTwitchGames', async () => {
      const titles = await getRepository(CacheTitles).find();
      socket.emit('sendUserTwitchGamesAndTitles', titles) ;
    });
    socket.on('deleteUserTwitchGame', async (game: string) => {
      await getManager()
        .createQueryBuilder()
        .delete()
        .from(CacheTitles, 'titles')
        .where('game = :game', { game })
        .execute();
      const titles = await getRepository(CacheTitles).find();
      socket.emit('sendUserTwitchGamesAndTitles', titles);
    });
    socket.on('cleanupGameAndTitle', async (data: { titles: { title: string, game: string; id: string }[], game: string, title: string }, cb: (err: string|null, titles: Readonly<Required<CacheTitlesInterface>>[]) => void) => {
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
    socket.on('updateGameAndTitle', async (data: { game: string, title: string, tags: string[] }, cb: (status: boolean | null) => void) => {
      const status = await setTitleAndGame(data);
      await setTags(data.tags);

      if (!status) { // twitch refused update
        cb(true);
      }

      data.title = data.title.trim();
      data.game = data.game.trim();

      const item = await getRepository(CacheTitles).findOne({
        game:  data.game,
        title: data.title,
      });

      if (!item) {
        await getManager()
          .createQueryBuilder()
          .insert()
          .into(CacheTitles)
          .values([
            {
              game: data.game, title: data.title, timestamp: Date.now(),
            },
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
    socket.on('custom.variable.value', async (variable: string, cb: (error: string | null, value: string) => void) => {
      let value = translate('webpanel.not-available');
      const isVarSet = await isVariableSet(variable);
      if (isVarSet) {
        value = await getValueOf(variable);
      }
      cb(null, value);
    });

    socket.on('responses.get', async function (at: string | null, callback: (responses: Record<string, string>) => void) {
      const responses = flatten(!_.isNil(at) ? translateLib.translations[getLang()][at] : translateLib.translations[getLang()]);
      _.each(responses, function (value, key) {
        const _at = !_.isNil(at) ? at + '.' + key : key;
        responses[key] = {}; // remap to obj
        responses[key].default = translate(_at, true);
        responses[key].current = translate(_at);
      });
      callback(responses);
    });
    socket.on('responses.set', function (data: { key: string }) {
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
    socket.on('responses.revert', async function (data: { name: string }, callback: (translation: string) => void) {
      _.remove(translateLib.custom, function (o: any) {
        return o.name === data.name;
      });
      await getRepository(Translation).delete({ name: data.name });
      callback(translate(data.name));
    });

    adminEndpoint('/', 'debug::get', (cb) => {
      cb(null, getDEBUG());
    });

    adminEndpoint('/', 'debug::set', (data) => {
      setDEBUG(data);
    });

    adminEndpoint('/', 'panel::alerts', (cb) => {
      const toShow: { errors: typeof errors, warns: typeof warns }  = { errors: [], warns: [] };
      do {
        const error = errors.shift();
        if (!error) {
          break;
        }

        if (!toShow.errors.find((o) => {
          return o.name === error.name && o.message === error.message;
        })) {
          toShow.errors.push(error);
        }
      } while (errors.length > 0);
      do {
        const warn = warns.shift();
        if (!warn) {
          break;
        }

        if (!toShow.warns.find((o) => {
          return o.name === warn.name && o.message === warn.message;
        })) {
          toShow.warns.push(warn);
        }
      } while (warns.length > 0);
      cb(null, toShow);
    });

    adminEndpoint('/', 'panel::availableWidgets', async (opts, cb) => {
      const dashboards = await getRepository(Dashboard).find({
        where:     { userId: opts.userId, type: opts.type },
        relations: ['widgets'],
        order:     { createdAt: 'ASC' },
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

    adminEndpoint('/', 'panel::dashboards', async (opts, cb) => {
      const userId = opts.userId;
      const dashboards = async () => {
        getRepository(Widget).delete({ dashboardId: IsNull() });
        return getRepository(Dashboard).find({
          where:     { userId: opts.userId, type: opts.type },
          relations: ['widgets'],
          order:     { createdAt: 'ASC' },
        });
      };

      if ((await dashboards()).length === 0) {
        const mainDashboard = await getRepository(Dashboard).findOne({
          userId, name: 'Main', type: 'admin',
        });
        if (!mainDashboard) {
          await getRepository(Dashboard).save({
            name: 'Main', createdAt: 0, userId, type: 'admin',
          });
        }
      }
      cb(null, await dashboards());
    });

    adminEndpoint('/', 'panel::dashboards::remove', async (opts, cb) => {
      await getRepository(Dashboard).delete({
        userId: opts.userId, type: opts.type, id: opts.id,
      });
      await getRepository(Widget).delete({ dashboardId: IsNull() });
      cb(null);
    });

    adminEndpoint('/', 'panel::dashboards::create', async (opts, cb) => {
      cb(null, await getRepository(Dashboard).save({
        name: opts.name, createdAt: Date.now(), id: uuid(), userId: opts.userId, type: 'admin',
      }));
    });

    socket.on('addWidget', async function (widgetName: string, id: string, cb: (dashboard?: DashboardInterface) => void) {
      // add widget to bottom left
      const dashboard = await getRepository(Dashboard).findOne({
        relations: ['widgets'],
        where:     { id } ,
      });
      if (dashboard) {
        let y = 0;
        for (const w of dashboard.widgets) {
          y = Math.max(y, w.positionY + w.height);
        }
        dashboard.widgets.push({
          name:      widgetName,
          positionX: 0,
          positionY: y,
          width:     4,
          height:    3,
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

    socket.on('connection_status', (cb: (status: typeof statusObj) => void) => {
      cb(statusObj);
    });
    socket.on('saveConfiguration', function (data: any) {
      _.each(data, async function (index, value) {
        if (value.startsWith('_')) {
          return true;
        }
        setValue({
          sender: getOwnerAsSender(), createdAt: 0, command: '', parameters: value + ' ' + index, attr: { quiet: data._quiet },
        });
      });
    });

    type toEmit = { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean }[];
    // send enabled systems
    socket.on('systems', async (cb: (err: string | null, toEmit: toEmit) => void) => {
      const toEmit: toEmit = [];
      for (const system of systems) {
        toEmit.push({
          name:                   system.__moduleName__.toLowerCase(),
          enabled:                system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv:        system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });
    socket.on('core', async (cb: (err: string | null, toEmit: { name: string }[]) => void) => {
      const toEmit: { name: string }[] = [];
      for (const system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch', 'socket', 'permissions']) {
        toEmit.push({ name: system.toLowerCase() });
      }
      cb(null, toEmit);
    });
    socket.on('integrations', async (cb: (err: string | null, toEmit: toEmit) => void) => {
      const toEmit: toEmit = [];
      for (const system of list('integrations')) {
        if (!system.showInUI) {
          continue;
        }
        toEmit.push({
          name:                   system.__moduleName__.toLowerCase(),
          enabled:                system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv:        system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });
    socket.on('overlays', async (cb: (err: string | null, toEmit: toEmit) => void) => {
      const toEmit: toEmit = [];
      for (const system of list('overlays')) {
        if (!system.showInUI) {
          continue;
        }
        toEmit.push({
          name:                   system.__moduleName__.toLowerCase(),
          enabled:                system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv:        system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });
    socket.on('games', async (cb: (err: string | null, toEmit: toEmit) => void) => {
      const toEmit: toEmit = [];
      for (const system of list('games')) {
        if (!system.showInUI) {
          continue;
        }
        toEmit.push({
          name:                   system.__moduleName__.toLowerCase(),
          enabled:                system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv:        system.isDisabledByEnv,
        });
      }
      cb(null, toEmit);
    });

    socket.on('name', function (cb: (botUsername: string) => void) {
      cb(oauth.botUsername);
    });
    socket.on('channelName', function (cb: (currentChannel: string) => void) {
      cb(oauth.currentChannel);
    });
    socket.on('version', function (cb: (version: string) => void) {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z');
      cb(version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'));
    });

    socket.on('parser.isRegistered', function (data: { emit: string, command: string }) {
      socket.emit(data.emit, { isRegistered: new Parser().find(data.command) });
    });

    adminEndpoint('/', 'menu', (cb) => {
      cb(null, menu.map((o) => ({
        category: o.category, name: o.name, id: o.id, enabled: o.this ? o.this.enabled : true,
      })));
    });

    publicEndpoint('/', 'menu::public', (cb) => {
      cb(null, menuPublic);
    });

    socket.on('translations', (cb: (lang: Record<string, any>) => void) => {
      const lang = {};
      _.merge(
        lang,
        translate({ root: 'webpanel' }),
        translate({ root: 'ui' }), // add ui root -> slowly refactoring to new name
        { bot: translate({ root: 'core' }) },
      );
      cb(lang);
    });

    // send webpanel translations
    const lang = {};
    _.merge(
      lang,
      translate({ root: 'webpanel' }),
      translate({ root: 'ui' }), // add ui root -> slowly refactoring to new name,
      { bot: translate({ root: 'core' }) },
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
  serverSecure?.listen(secureport, () => {
    info(`WebPanel is available at https://localhost:${secureport}`);
  });
};

let lastDataSent: null | Record<string, unknown> = null;
const sendStreamData = async () => {
  try {
    if (!translateLib.isLoaded) {
      throw new Error('Translation not yet loaded');
    }

    const ytCurrentSong = Object.values(songs.isPlaying).find(o => o) ? _.get(JSON.parse(songs.currentSong), 'title', null) : null;
    let spotifyCurrentSong: null | string = _.get(JSON.parse(spotify.currentSong), 'song', '') + ' - ' + _.get(JSON.parse(spotify.currentSong), 'artist', '');
    if (spotifyCurrentSong.trim().length === 1 /* '-' */  || !_.get(JSON.parse(spotify.currentSong), 'is_playing', false)) {
      spotifyCurrentSong = null;
    }

    const data = {
      broadcasterType:    oauth.broadcasterType,
      uptime:             isStreamOnline.value ? streamStatusChangeSince.value : null,
      currentViewers:     stats.value.currentViewers,
      currentSubscribers: stats.value.currentSubscribers,
      currentBits:        stats.value.currentBits,
      currentTips:        stats.value.currentTips,
      chatMessages:       isStreamOnline.value ? linesParsed - chatMessagesAtStart.value : 0,
      currentFollowers:   stats.value.currentFollowers,
      currentViews:       stats.value.currentViews,
      maxViewers:         stats.value.maxViewers,
      newChatters:        stats.value.newChatters,
      game:               stats.value.currentGame,
      status:             stats.value.currentTitle,
      rawStatus:          rawStatus.value,
      currentSong:        lastfm.currentSong || ytCurrentSong || spotifyCurrentSong || translate('songs.not-playing'),
      currentWatched:     stats.value.currentWatchedTime,
      tags:               currentStreamTags.value,
    };
    if (!isEqual(data, lastDataSent)) {
      ioServer?.emit('panel::stats', data);
    }
    lastDataSent = data;
  } catch (e) {}
  setTimeout(async () => await sendStreamData(), 5000);
};

sendStreamData();