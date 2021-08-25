'use strict';

import fs from 'fs';
import path from 'path';

import cors from 'cors';
import express from 'express';
import RateLimit from 'express-rate-limit';
import gitCommitInfo from 'git-commit-info';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import _, { isEqual } from 'lodash';
import sanitize from 'sanitize-filename';
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from 'tsoa';
import {
  getConnection, getManager, getRepository,
} from 'typeorm';

import { RegisterRoutes } from './.cache/routes';
import * as swaggerJSON from './.cache/swagger.json';
import { CacheTitles } from './database/entity/cacheTitles';
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
import { UnauthorizedError } from './helpers/errors';
import { flatten } from './helpers/flatten';
import { setValue } from './helpers/general';
import { getLang } from './helpers/locales';
import {
  error,
  getDEBUG, info, setDEBUG,
} from './helpers/log';
import {
  app, ioServer, server, serverSecure, setApp, setServer,
} from './helpers/panel';
import { socketsConnectedDec, socketsConnectedInc } from './helpers/panel/';
import { errors, warns } from './helpers/panel/alerts';
import { linesParsed, status as statusObj } from './helpers/parser';
import { list, systems } from './helpers/register';
import { adminEndpoint } from './helpers/socket';
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
  windowMs: 60 * 1000,
  max:      1000,
  skip:     (req) => {
    return req.url.includes('/socket/refresh');
  },
  message:      'Too many requests from this IP, please try again after several minutes.',
  keyGenerator: (req) => {
    return req.ip + req.url;
  },
});

export const init = () => {
  setApp(express());
  app?.enable('trust proxy');
  app?.use(limiter);
  app?.use(cors());
  app?.use(express.json({
    limit:  '500mb',
    verify: (req, _res, buf) =>{
    // Small modification to the JSON bodyParser to expose the raw body in the request object
    // The raw body is required at signature verification
      (req as any).rawBody = buf;
    },
  }));
  app?.use(express.urlencoded({ extended: true, limit: '500mb' }));
  app?.use(express.raw());
  app?.use('/frame-api-explorer', swaggerUi.serve, swaggerUi.setup({
    ...swaggerJSON,
    info: {
      ...swaggerJSON.info,
      title:       'API Explorer',
      description: {},
      contact:     {},
      license:     {},
    },
  }));
  RegisterRoutes(app as any);
  app?.use(function errorHandler(
    err: UnauthorizedError | Error,
    _req: any,
    res: any,
    next: () => void,
  ): Express.Response | void {
    if (err instanceof ValidateError) {
      return res.status(400).json({
        message: 'Validation Failed',
        details: err.fields,
      });
    }
    if (err instanceof UnauthorizedError || err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
      return res.status(401).send(err.message);
    }
    if (err instanceof Error) {
      error(err);
      return res.status(500).send('Internal Server Error');
    }

    next();
  });

  setServer();

  // highlights system
  app?.get('/highlights/:id', (req, res) => {
    highlights.url(req, res);
  });

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
  app?.get(['/_static/*', '/credentials/_static/*'], (req, res) => {
    if (!nuxtCache.get(req.url)) {
      // search through node_modules to find correct nuxt file
      const paths = [
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-oauth', 'dist', '_static'),
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-public', 'dist', '_static'),
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-admin', 'dist', '_static'),
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-overlay', 'dist', '_static'),
      ];
      for (const dir of paths) {
        const pathToFile = path.join(dir, req.url.replace('_static', ''));
        if (fs.existsSync(pathToFile)) { // lgtm [js/path-injection]
          nuxtCache.set(req.url, pathToFile);
        }
      }
    }

    const filepath = path.join(nuxtCache.get(req.url) ?? '') as string;
    if (fs.existsSync(filepath) && nuxtCache.has(req.url)) { // lgtm [js/path-injection]
      res.sendFile(filepath);
    } else {
      res.sendStatus(404);
    }
  });
  app?.get(['/_nuxt/*', '/credentials/_nuxt/*', '/overlays/_nuxt/*'], (req, res) => {
    if (!nuxtCache.get(req.url)) {
      // search through node_modules to find correct nuxt file
      const paths = [
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-oauth', 'dist', '_nuxt'),
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-public', 'dist', '_nuxt'),
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-admin', 'dist', '_nuxt'),
        path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-overlay', 'dist', '_nuxt'),
      ];
      for (const dir of paths) {
        const pathToFile = path.join(dir, req.url.replace('_nuxt', '').replace('credentials', '').replace('overlays', ''));
        if (fs.existsSync(pathToFile)) { // lgtm [js/path-injection]
          nuxtCache.set(req.url, pathToFile);
        }
      }
    }
    const filepath = path.join(nuxtCache.get(req.url) ?? '');
    if (fs.existsSync(filepath) && nuxtCache.has(req.url)) { // lgtm [js/path-injection]
      res.sendFile(filepath);
    } else {
      nuxtCache.delete(req.url);
      res.sendStatus(404);
    }
  });
  app?.get('/webhooks/callback', function (req, res) {
    if (req.secure) {
      res.status(200).send('OK');
    } else {
      res.status(400).send('You can only use this endpoint with SSL');
    }
  });
  app?.post('/webhooks/callback', function (req, res) {
    const eventsub = require('./eventsub').default;
    eventsub.handler(req, res);
  });
  app?.get('/popout/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'popout.html'));
  });
  app?.get(['/overlays/:id', '/overlays/text/:id', '/overlays/alerts/:id', '/overlays/goals/:id'], function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-overlay', 'dist', 'index.html'));
  });
  app?.get('/public/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-public', 'dist', 'index.html'));
  });
  app?.get('/credentials/oauth/:page?', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-oauth', 'dist', 'oauth', 'index.html'));
  });
  app?.get('/credentials/login', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-oauth', 'dist', 'login', 'index.html'));
  });
  app?.get('/assets/:asset/:file?', function (req, res) {
    if (req.params.file) {
      res.sendFile(path.join(__dirname, '..', 'assets', sanitize(req.params.asset), sanitize(req.params.file)));
    } else {
      res.sendFile(path.join(__dirname, '..', 'assets', sanitize(req.params.asset)));
    }
  });
  app?.get('/custom/:custom', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'custom', sanitize(req.params.custom) + '.html'));
  });
  app?.get('/fonts', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'fonts.json'));
  });
  app?.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'favicon.ico'));
  });
  app?.get('/:page?', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'node_modules', '@sogebot', 'ui-admin', 'dist', 'index.html'));
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

    socket.on('getCachedTags', async (cb: (results: TwitchTagInterface[]) => void) => {
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
    socket.on('getGameFromTwitch', function (game: string, cb) {
      sendGameFromTwitch(game).then((data) => cb(data));
    });
    socket.on('getUserTwitchGames', async (cb) => {
      const titles = await getRepository(CacheTitles).find();
      cb(titles);
    });
    socket.on('cleanupGameAndTitle', async () => {
      // remove empty titles
      await getManager()
        .createQueryBuilder()
        .delete()
        .from(CacheTitles, 'titles')
        .where('title = :title', { title: '' })
        .execute();

      // remove duplicates
      const allTitles = await getRepository(CacheTitles).find();
      for (const t of allTitles) {
        const titles = allTitles.filter(o => o.game === t.game && o.title === t.title);
        if (titles.length > 1) {
          // remove title if we have more than one title
          await getManager()
            .createQueryBuilder()
            .delete()
            .from(CacheTitles, 'titles')
            .where('id = :id', { id: t.id })
            .execute();
        }
      }
    });
    socket.on('updateGameAndTitle', async (data: { game: string, title: string, tags: string[] }, cb: (status: boolean | null) => void) => {
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
      } else {
        // update timestamp
        await getRepository(CacheTitles).save({ ...item, timestamp: Date.now() });
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

    socket.on('responses.get', async function (at: string | null, callback: (responses: Record<string, string>) => void) {
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
    socket.on('responses.revert', async function (data: { name: string }, callback: (translation: string) => void) {
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
        const err = errors.shift();
        if (!err) {
          break;
        }

        if (!toShow.errors.find((o) => {
          return o.name === err.name && o.message === err.message;
        })) {
          toShow.errors.push(err);
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

    type toEmit = { name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean; type: string; }[];
    // send enabled systems
    socket.on('systems', async (cb: (err: string | null, toEmit: toEmit) => void) => {
      const toEmit: toEmit = [];
      for (const system of systems) {
        toEmit.push({
          name:                   system.__moduleName__.toLowerCase(),
          enabled:                system.enabled,
          areDependenciesEnabled: await system.areDependenciesEnabled,
          isDisabledByEnv:        system.isDisabledByEnv,
          type:                   'systems',
        });
      }
      cb(null, toEmit);
    });
    socket.on('core', async (cb: (err: string | null, toEmit: { name: string; type: string; }[]) => void) => {
      const toEmit: { name: string; type: string; }[] = [];
      for (const system of ['oauth', 'tmi', 'currency', 'ui', 'general', 'twitch', 'socket', 'updater']) {
        toEmit.push({ name: system.toLowerCase(), type: 'core' });
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
          type:                   'integrations',
        });
      }
      cb(null, toEmit);
    });
    socket.on('overlays', async (cb: (err: string | null, toEmit: { name: string; type: string; }[]) => void) => {
      const toEmit: { name: string; type: string; }[] = [];
      for (const system of list('overlays')) {
        if (!system.showInUI) {
          continue;
        }
        toEmit.push({ name: system.__moduleName__.toLowerCase(), type: 'overlays' });
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
          type:                   'games',
        });
      }
      cb(null, toEmit);
    });

    socket.on('name', function (cb: (botUsername: string) => void) {
      cb(oauth.botUsername);
    });
    socket.on('channelName', function (cb: (currentChannel: string) => void) {
      cb(oauth.currentChannel);
    });
    socket.on('version', function (cb: (version: string) => void) {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z');
      cb(version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'));
    });

    socket.on('parser.isRegistered', function (data: { emit: string, command: string }) {
      socket.emit(data.emit, { isRegistered: new Parser().find(data.command) });
    });

    socket.on('translations', (cb: (lang: Record<string, any>) => void) => {
      const lang = {};
      _.merge(
        lang,
        translate({ root: 'webpanel' }),
        translate({ root: 'ui' }), // add ui root -> slowly refactoring to new name
        { bot: translate({ root: 'core' }) },
      );
      cb(lang);
    });

    // send webpanel translations
    const lang = {};
    _.merge(
      lang,
      translate({ root: 'webpanel' }),
      translate({ root: 'ui' }), // add ui root -> slowly refactoring to new name,
      { bot: translate({ root: 'core' }) },
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
      throw new Error('Translation not yet loaded');
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
  } catch (e) {
    if (e.message !== 'Translation not yet loaded') {
      error(e);
    }
  }
  setTimeout(async () => await sendStreamData(), 5000);
};

sendStreamData();