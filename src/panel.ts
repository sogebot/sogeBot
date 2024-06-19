import { existsSync, readFileSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import axios from 'axios';
import cors from 'cors';
import express, { Request } from 'express';
import RateLimit from 'express-rate-limit';
import gitCommitInfo from 'git-commit-info';
import _ from 'lodash-es';
import sanitize from 'sanitize-filename';
import { z } from 'zod';

import { Get, Post } from './decorators/endpoint.js';
import { getDEBUG, setDEBUG } from './helpers/debug.js';
import { possibleLists } from '../d.ts/src/helpers/socket.js';

import Core from '~/_interface.js';
import { CacheGames, CacheGamesInterface } from '~/database/entity/cacheGames.js';
import { CacheTitles } from '~/database/entity/cacheTitles.js';
import { Translation } from '~/database/entity/translation.js';
import { User } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import { onStartup } from '~/decorators/on.js';
import { getOwnerAsSender } from '~/helpers/commons/getOwnerAsSender.js';
import {
  getURL, getValueOf, isVariableSet, postURL,
} from '~/helpers/customvariables/index.js';
import { getIsBotStarted } from '~/helpers/database.js';
import { flatten } from '~/helpers/flatten.js';
import { setValue } from '~/helpers/general/index.js';
import { getLang } from '~/helpers/locales.js';
import {
  info,
} from '~/helpers/log.js';
import { socketsConnectedDec, socketsConnectedInc } from '~/helpers/panel/index.js';
import {
  app, ioServer, server, serverSecure, setApp, setServer,
} from '~/helpers/panel.js';
import { status as statusObj } from '~/helpers/parser.js';
import { list } from '~/helpers/register.js';
import { tmiEmitter } from '~/helpers/tmi/index.js';
import * as changelog from '~/helpers/user/changelog.js';
import { Parser } from '~/parser.js';
import { getGameThumbnailFromName } from '~/services/twitch/calls/getGameThumbnailFromName.js';
import { sendGameFromTwitch } from '~/services/twitch/calls/sendGameFromTwitch.js';
import { updateChannelInfo } from '~/services/twitch/calls/updateChannelInfo.js';
import { processAuth, default as socketSystem } from '~/socket.js';
import highlights from '~/systems/highlights.js';
import translateLib, { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

// __dirname is not available in ES6 module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = Number(process.env.PORT ?? 20000);
const secureport = Number(process.env.SECUREPORT ?? 20443);

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

class Panel extends Core {
  @onStartup()
  onStartup() {
    this.init();
    this.expose();
  }

  expose () {
    server.listen(port, '::');
    server.listen(port, '0.0.0.0', () => {
      info(`WebPanel is available at http://localhost:${port} or https://dash.sogebot.xyz/?server=http://localhost:${port}`);
    });
    serverSecure?.listen(secureport, '0.0.0.0', () => {
      info(`WebPanel is available at https://localhost:${port} or https://dash.sogebot.xyz/?server=https://localhost:${port}`);
    });
  }

  @Get('/debug')
  async getDebug() {
    return getDEBUG();
  }

  @Post('/debug', { zodValidator: z.object({ debug: z.string() }) })
  async setDebug(req: Request) {
    return setDEBUG(req.body.debug);
  }

  init () {
    setApp(express());
    app?.use(processAuth);
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

    setServer();

    // highlights system
    app?.get('/highlights/:id', (req, res) => {
      highlights.url(req, res);
    });

    app?.get('/health', (req, res) => {
      if (getIsBotStarted()) {
        const version = _.get(process, 'env.npm_package_version', 'x.y.z');
        const commitFile = existsSync('./.commit') ? readFileSync('./.commit').toString() : null;
        res.status(200).send(version.replace('SNAPSHOT', commitFile && commitFile.length > 0 ? commitFile : gitCommitInfo().shortHash || 'SNAPSHOT'));
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

    app?.get('/webhooks/callback', function (req, res) {
      res.status(200).send('OK');
    });
    app?.get('/popout/', function (req, res) {
      res.sendFile(path.join(__dirname, '..', 'public', 'popout.html'));
    });
    app?.get('/assets/:asset/:file?', function (req, res) {
      if (req.params.file) {
        res.sendFile(path.join(__dirname, '..', 'assets', sanitize(req.params.asset), sanitize(req.params.file)));
      } else {
        res.sendFile(path.join(__dirname, '..', 'assets', sanitize(req.params.asset)));
      }
    });
    app?.get('/fonts', function (req, res) {
      res.sendFile(path.join(__dirname, '..', 'fonts.json'));
    });
    app?.get('/favicon.ico', function (req, res) {
      res.sendFile(path.join(__dirname, '..', 'favicon.ico'));
    });
    app?.get('/', function (req, res) {
      res.status(301).redirect(`https://dash.sogebot.xyz/?server=` + req.protocol + '://' + req.get('host'));
    });
    app?.get('/_dash_version', async function (req, res) {
      try {
        const response = await axios.get(`https://hub.docker.com/v2/repositories/sogebot/dashboard/tags`);

        if (response.status === 200) {
          const tags = response.data.results.map((tag: any) => tag.name);
          res.status(200).send(tags[0] === 'latest' ? tags[1] : tags[0]);
        } else {
          res.status(response.status).send(`Failed to fetch tags for dashboard. Status code: ${response.status}`);
        }
      } catch (error) {
        res.status(500).send(`Failed to fetch tags for dashboard: ${error}`);
      }
    });

    ioServer?.use(socketSystem.authorize as any);

    ioServer?.on('connect', async (socket) => {
      socket.on('disconnect', () => {
        socketsConnectedDec();
      });
      socketsConnectedInc();

      // twitch game and title change
      socket.on('getGameFromTwitch', function (game: string, cb) {
        sendGameFromTwitch(game).then((data) => cb(data));
      });
      socket.on('getUserTwitchGames', async (cb) => {
        let titles = await AppDataSource.getRepository(CacheTitles).find();
        const cachedGames = await AppDataSource.getRepository(CacheGames).find();

        // we need to cleanup titles if game is not in cache
        for (const title of titles) {
          if (!cachedGames.map(o => o.name).includes(title.game)) {
            await AppDataSource.getRepository(CacheTitles).delete({ game: title.game });
          }
        }

        const games: CacheGamesInterface[] = [];
        for (const game of cachedGames) {
          games.push({
            ...game,
            thumbnail: await getGameThumbnailFromName(game.name) || '',
          });
        }
        titles = await AppDataSource.getRepository(CacheTitles).find();
        cb(titles, games);
      });
      socket.on('cleanupGameAndTitle', async () => {
      // remove empty titles
        await AppDataSource
          .createQueryBuilder()
          .delete()
          .from(CacheTitles, 'titles')
          .where('title = :title', { title: '' })
          .execute();

        // remove duplicates
        const allTitles = await AppDataSource.getRepository(CacheTitles).find();
        for (const t of allTitles) {
          const titles = allTitles.filter(o => o.game === t.game && o.title === t.title);
          if (titles.length > 1) {
          // remove title if we have more than one title
            await AppDataSource
              .createQueryBuilder()
              .delete()
              .from(CacheTitles, 'titles')
              .where('id = :id', { id: t.id })
              .execute();
          }
        }
      });
      socket.on('updateGameAndTitle', async (data: { game: string, title: string, tags: string[], contentClassificationLabels: string[] }, cb: (status: boolean | null) => void) => {
        const status = await updateChannelInfo(data);

        if (!status) { // twitch refused update
          cb(true);
        }

        data.title = data.title.trim();
        data.game = data.game.trim();

        const item = await AppDataSource.getRepository(CacheTitles).findOneBy({
          game:  data.game,
          title: data.title,
        });

        if (!item) {
          await AppDataSource
            .createQueryBuilder()
            .insert()
            .into(CacheTitles)
            .values([
              {
                game: data.game, title: data.title, timestamp: Date.now(), tags: data.tags, content_classification_labels: data.contentClassificationLabels,
              },
            ])
            .execute();
        } else {
        // update timestamp
          await AppDataSource.getRepository(CacheTitles).save({ ...item, timestamp: Date.now(), tags: data.tags, content_classification_labels: data.contentClassificationLabels });
        }
        cb(null);
      });
      socket.on('joinBot', async () => {
        tmiEmitter.emit('join', 'bot');
      });
      socket.on('leaveBot', async () => {
        tmiEmitter.emit('part', 'bot');
        // force all users offline
        await changelog.flush();
        await AppDataSource.getRepository(User).update({}, { isOnline: false });
      });

      // custom var
      socket.on('custom.variable.value', async (_variable: string, cb: (error: string | null, value: string) => void) => {
        let value = translate('webpanel.not-available');
        const isVarSet = await isVariableSet(_variable);
        if (isVarSet) {
          value = await getValueOf(_variable);
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
        await AppDataSource.getRepository(Translation).delete({ name: data.name });
        callback(translate(data.name));
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
            sender: getOwnerAsSender(), createdAt: 0, command: '', parameters: value + ' ' + index, attr: { quiet: data._quiet }, isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
          });
        });
      });

      socket.on('populateListOf', async (type: possibleLists, cb: (err: string | null, toEmit: any) => void) => {
        const toEmit: any[] = [];
        if (type === 'systems') {
          for (const system of list('systems')) {
            toEmit.push({
              name:                   system.__moduleName__.toLowerCase(),
              enabled:                system.enabled,
              areDependenciesEnabled: await system.areDependenciesEnabled,
              isDisabledByEnv:        system.isDisabledByEnv,
              type:                   'systems',
            });
          }
        } else if (type === 'services') {
          for (const system of list('services')) {
            toEmit.push({
              name: system.__moduleName__.toLowerCase(),
              type: 'services',
            });
          }
        } else if (type === 'core') {
          for (const system of ['dashboard', 'currency', 'ui', 'general', 'twitch', 'socket', 'eventsub', 'tts', 'emotes']) {
            toEmit.push({ name: system.toLowerCase(), type: 'core' });
          }
        } else if (type === 'integrations') {
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
        } else if (type === 'overlays') {
          for (const system of list('overlays')) {
            if (!system.showInUI) {
              continue;
            }
            toEmit.push({ name: system.__moduleName__.toLowerCase(), type: 'overlays' });
          }
        } else if (type === 'games') {
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
        }

        cb(null, toEmit);
      });

      socket.on('name', function (cb: (botUsername: string) => void) {
        cb(variables.get('services.twitch.botUsername') as string);
      });
      socket.on('channelName', function (cb: (broadcasterUsername: string) => void) {
        cb(variables.get('services.twitch.broadcasterUsername') as string);
      });
      socket.on('version', function (cb: (version: string) => void) {
        const version = _.get(process, 'env.npm_package_version', 'x.y.z');
        const commitFile = existsSync('./.commit') ? readFileSync('./.commit').toString() : null;
        cb(version.replace('SNAPSHOT', commitFile && commitFile.length > 0 ? commitFile : gitCommitInfo().shortHash || 'SNAPSHOT'));
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
  }
}

export const getServer = function () {
  return server;
};

export const getApp = function () {
  return app;
};

export default new Panel();