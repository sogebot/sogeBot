import { CacheGames } from '@entity/cacheGames.js';
import { HowLongToBeatGame } from '@entity/howLongToBeatGame.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import { HowLongToBeatService } from 'howlongtobeat';
import { EntityNotFoundError } from 'typeorm';

import System from './_interface.js';
import { onStartup } from '../decorators/on.js';
import { command, default_permission } from '../decorators.js';
import { Expects } from  '../expects.js';

import { AppDataSource } from '~/database.js';
import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { prepare } from '~/helpers/commons/index.js';
import {
  debug, error,
} from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { adminMiddleware } from '~/socket.js';

class HowLongToBeat extends System {
  interval: number = constants.MINUTE;
  hltbService = new HowLongToBeatService();

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'manage', name: 'howlongtobeat', id: 'manage/howlongtobeat', this: this,
    });

    setInterval(() => {
      this.updateGameplayTimes();
    }, constants.HOUR);

    let lastDbgMessage = '';
    setInterval(async () => {
      const dbgMessage = `streamOnline: ${isStreamOnline.value}, enabled: ${this.enabled}, currentGame: ${ stats.value.currentGame}`;
      if (lastDbgMessage !== dbgMessage) {
        lastDbgMessage = dbgMessage;
        debug('hltb', dbgMessage);
      }
      if (isStreamOnline.value && this.enabled) {
        this.addToGameTimestamp();
      }
    }, this.interval);
  }

  async updateGameplayTimes() {
    const games = await HowLongToBeatGame.find();

    for (const game of games) {
      try {
        if (Date.now() - new Date(game.updatedAt!).getTime() < constants.DAY) {
          throw new Error('Updated recently');
        }

        if (['irl', 'always on', 'software and game development'].includes(game.game.toLowerCase())) {
          throw new Error('Ignored game');
        }

        const gameFromHltb = (await this.hltbService.search(game.game))[0];
        if (!gameFromHltb) {
          throw new Error('Game not found');
        }

        game.gameplayMain = gameFromHltb.gameplayMain;
        game.gameplayMainExtra = gameFromHltb.gameplayMainExtra;
        game.gameplayCompletionist = gameFromHltb.gameplayCompletionist;
        await game.save();
      } catch (e) {
        continue;
      }
    }
  }

  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/hltb', adminMiddleware, async (req, res) => {
      res.send({
        data:       await HowLongToBeatGame.find(),
        thumbnails: await AppDataSource.getRepository(CacheGames).find(),
      });
    });
    app.post('/api/systems/hltb/:id', async (req, res) => {
      try {
        delete req.body.streams; // remove streams to not change this

        let game = await HowLongToBeatGame.findOne({ where: { id: req.params.id } });
        if (!game) {
          game = HowLongToBeatGame.create(req.body);
        } else {
          for (const key of Object.keys(req.body)) {
            (game as any)[key as any] = req.body[key];
          }
        }
        res.send({
          data: await game!.validateAndSave(),
        });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
    });
    app.get('/api/systems/hltb/:id', async (req, res) => {
      res.send({
        data: await HowLongToBeatGame.findOne({ where: { id: req.params.id } }),
      });
    });
    app.delete('/api/systems/hltb/:id', adminMiddleware, async (req, res) => {
      const item = await HowLongToBeatGame.findOne({ where: { id: req.params.id } });
      await item?.remove();
      res.status(404).send();
    });
    app.post('/api/systems/hltb', adminMiddleware, async (req, res) => {
      try {
        if (req.query.search) {
          const search = await this.hltbService.search(req.query.search as string);
          const games = await HowLongToBeatGame.find();

          res.send({
            data: search
              .filter((o: any) => {
              // we need to filter already added gaems
                return !games.map(a => a.game.toLowerCase()).includes(o.name.toLowerCase());
              })
              .map((o: any) => o.name),
          });
        } else {
          const game = HowLongToBeatGame.create({
            game:                  req.body.game,
            startedAt:             new Date().toISOString(),
            updatedAt:             new Date().toISOString(),
            gameplayMain:          0,
            gameplayMainExtra:     0,
            gameplayCompletionist: 0,
          });
          await game.validateAndSave();
          res.send({
            data: game,
          });
        }
      } catch (e: any) {
        res.status(400).send({ errors: e });
      }
    });
  }

  async addToGameTimestamp() {
    if (!stats.value.currentGame) {
      debug('hltb', 'No game being played on stream.');
      return; // skip if we don't have game
    }

    if (stats.value.currentGame.trim().length === 0) {
      debug('hltb', 'Empty game is being played on stream');
      return; // skip if we have empty game
    }

    try {
      const game = await HowLongToBeatGame.findOneOrFail({ where: { game: stats.value.currentGame } });
      const stream = game.streams.find(o => o.createdAt === new Date(streamStatusChangeSince.value).toISOString());
      if (stream) {
        debug('hltb', 'Another 15s entry of this stream for ' + stats.value.currentGame);
        stream.timestamp += this.interval;
      } else {
        debug('hltb', 'First entry of this stream for ' + stats.value.currentGame);
        game.streams.push({
          createdAt:              new Date(streamStatusChangeSince.value).toISOString(),
          timestamp:              this.interval,
          offset:                 0,
          isMainCounted:          false,
          isCompletionistCounted: false,
          isExtraCounted:         false,
        });
      }
      await game.save();
    } catch (e: any) {
      if (e instanceof EntityNotFoundError) {
        try {
          if (['irl', 'always on', 'software and game development'].includes(stats.value.currentGame.toLowerCase())) {
            throw new Error('Ignored game');
          }

          const gameFromHltb = (await this.hltbService.search(stats.value.currentGame))[0];
          if (!gameFromHltb) {
            throw new Error('Game not found');
          }
          // we don't care if MP game or not (user might want to track his gameplay time)
          const game = HowLongToBeatGame.create({
            game:                  stats.value.currentGame,
            gameplayMain:          gameFromHltb.gameplayMain,
            gameplayMainExtra:     gameFromHltb.gameplayMainExtra,
            gameplayCompletionist: gameFromHltb.gameplayCompletionist,
          });
          await game.save();
        } catch {
          const game = HowLongToBeatGame.create({
            game:                  stats.value.currentGame,
            gameplayMain:          0,
            gameplayMainExtra:     0,
            gameplayCompletionist: 0,
          });
          await game.save();
        }
      } else {
        error(e.stack);
      }
    }
  }

  @command('!hltb')
  @default_permission(defaultPermissions.CASTERS)
  async currentGameInfo(opts: CommandOptions, retry = false): Promise<CommandResponse[]> {
    let [gameInput] = new Expects(opts.parameters)
      .everything({ optional: true })
      .toArray();

    if (!gameInput) {
      if (!stats.value.currentGame) {
        return []; // skip if we don't have game
      } else {
        gameInput = stats.value.currentGame;
      }
    }
    const gameToShow = await HowLongToBeatGame.findOne({ where: { game: gameInput } });
    if (!gameToShow && !retry) {
      if (!stats.value.currentGame) {
        return this.currentGameInfo(opts, true);
      }

      if (stats.value.currentGame.trim().length === 0 || stats.value.currentGame.trim() === 'IRL') {
        return this.currentGameInfo(opts, true);
      }
      return this.currentGameInfo(opts, true);
    } else if (!gameToShow) {
      return [{ response: prepare('systems.howlongtobeat.error', { game: gameInput }), ...opts }];
    }
    const timeToBeatMain = (gameToShow.streams.filter(o => o.isMainCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset , 0) + gameToShow.offset) / constants.HOUR;
    const timeToBeatMainExtra = (gameToShow.streams.filter(o => o.isExtraCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset, 0) + gameToShow.offset) / constants.HOUR;
    const timeToBeatCompletionist = (gameToShow.streams.filter(o => o.isCompletionistCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset, 0) + gameToShow.offset) / constants.HOUR;

    const gameplayMain = gameToShow.gameplayMain;
    const gameplayMainExtra = gameToShow.gameplayMainExtra;
    const gameplayCompletionist = gameToShow.gameplayCompletionist;

    if (gameplayMain === 0) {
      return [{
        response: prepare('systems.howlongtobeat.multiplayer-game', {
          game:                 gameInput,
          currentMain:          timeToBeatMain.toFixed(1),
          currentMainExtra:     timeToBeatMainExtra.toFixed(1),
          currentCompletionist: timeToBeatCompletionist.toFixed(1),
        }), ...opts,
      }];
    }

    return [{
      response: prepare('systems.howlongtobeat.game', {
        game:                 gameInput,
        hltbMain:             gameplayMain,
        hltbCompletionist:    gameplayCompletionist,
        hltbMainExtra:        gameplayMainExtra,
        currentMain:          timeToBeatMain.toFixed(1),
        currentMainExtra:     timeToBeatMainExtra.toFixed(1),
        currentCompletionist: timeToBeatCompletionist.toFixed(1),
        percentMain:          Number((timeToBeatMain / gameplayMain) * 100).toFixed(2),
        percentMainExtra:     Number((timeToBeatMainExtra / gameplayMainExtra) * 100).toFixed(2),
        percentCompletionist: Number((timeToBeatCompletionist / gameplayCompletionist) * 100).toFixed(2),
      }), ...opts,
    }];
  }
}

export default new HowLongToBeat();
