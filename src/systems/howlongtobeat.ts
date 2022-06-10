import { HowLongToBeatGame, HowLongToBeatGameItem } from '@entity/howLongToBeatGame';
import * as constants from '@sogebot/ui-helpers/constants';
import { HowLongToBeatService } from 'howlongtobeat';
import { EntityNotFoundError } from 'typeorm';
import { getRepository } from 'typeorm';

import { command, default_permission } from '../decorators';
import { onStartup } from '../decorators/on';
import Expects from '../expects';
import System from './_interface';

import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api';
import { prepare } from '~/helpers/commons';
import {
  debug, error,
} from '~/helpers/log';
import { defaultPermissions } from '~/helpers/permissions/index';
import { adminEndpoint } from '~/helpers/socket';

class HowLongToBeat extends System {
  interval: number = constants.SECOND * 15;
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
    const games = await getRepository(HowLongToBeatGame).find();

    for (const game of games) {
      try {
        if (Date.now() - new Date(game.updatedAt).getTime() < constants.DAY) {
          throw new Error('Updated recently');
        }

        if (['irl', 'always on', 'software and game development'].includes(game.game.toLowerCase())) {
          throw new Error('Ignored game');
        }

        const gameFromHltb = (await this.hltbService.search(game.game))[0];
        if (!gameFromHltb) {
          throw new Error('Game not found');
        }

        await getRepository(HowLongToBeatGame).save({
          ...game,
          updatedAt:             new Date().toISOString(),
          gameplayMain:          gameFromHltb.gameplayMain,
          gameplayMainExtra:     gameFromHltb.gameplayMainExtra,
          gameplayCompletionist: gameFromHltb.gameplayCompletionist,
        });
      } catch (e) {
        continue;
      }
    }
  }

  sockets() {
    adminEndpoint('/systems/howlongtobeat', 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(HowLongToBeatGame).find(), await getRepository(HowLongToBeatGameItem).find());
      } catch (e: any) {
        cb(e.stack, [], []);
      }
    });
    adminEndpoint('/systems/howlongtobeat', 'hltb::save', async (item, cb) => {
      try {
        cb(null, await getRepository(HowLongToBeatGame).save(item));
      } catch (e: any) {
        cb(e.stack);
      }
    });
    adminEndpoint('/systems/howlongtobeat', 'hltb::addNewGame', async (game, cb) => {
      try {
        const gameFromHltb = (await this.hltbService.search(game))[0];
        if (gameFromHltb) {
          await getRepository(HowLongToBeatGame).save({
            game:                  game,
            startedAt:             new Date().toISOString(),
            updatedAt:             new Date().toISOString(),
            gameplayMain:          gameFromHltb.gameplayMain,
            gameplayMainExtra:     gameFromHltb.gameplayMainExtra,
            gameplayCompletionist: gameFromHltb.gameplayCompletionist,
          });
        } else {
          throw new Error(`Game ${game} not found on HLTB service`);
        }
        cb(null);
      } catch (e: any) {
        cb(e.stack);
      }
    });
    adminEndpoint('/systems/howlongtobeat', 'hltb::getGamesFromHLTB', async (game, cb) => {
      try {
        const search = await this.hltbService.search(game);
        const games = await getRepository(HowLongToBeatGame).find();
        cb(null, search
          .filter((o: any) => {
            // we need to filter already added gaems
            return !games.map(a => a.game.toLowerCase()).includes(o.name.toLowerCase());
          })
          .map((o: any) => o.name));
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/systems/howlongtobeat', 'generic::deleteById', async (id, cb) => {
      await getRepository(HowLongToBeatGame).delete({ id: String(id) });
      await getRepository(HowLongToBeatGameItem).delete({ hltb_id: String(id) });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/systems/howlongtobeat', 'hltb::saveStreamChange', async (stream, cb) => {
      try {
        cb(null, await getRepository(HowLongToBeatGameItem).save(stream));
      } catch (e: any) {
        cb(e.stack);
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
      const game = await getRepository(HowLongToBeatGame).findOneOrFail({ where: { game: stats.value.currentGame } });
      const stream = await getRepository(HowLongToBeatGameItem).findOne({ where: { hltb_id: game.id, createdAt: new Date(streamStatusChangeSince.value).toISOString() } });
      if (stream) {
        debug('hltb', 'Another 15s entry of this stream for ' + stats.value.currentGame);
        await getRepository(HowLongToBeatGameItem).increment({ id: stream.id }, 'timestamp', this.interval);
      } else {
        debug('hltb', 'First entry of this stream for ' + stats.value.currentGame);
        await getRepository(HowLongToBeatGameItem).save({
          createdAt: new Date(streamStatusChangeSince.value).toISOString(),
          hltb_id:   game.id,
          timestamp: this.interval,
        });
      }
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
          await getRepository(HowLongToBeatGame).save({
            game:                  stats.value.currentGame,
            startedAt:             new Date().toISOString(),
            updatedAt:             new Date().toISOString(),
            gameplayMain:          gameFromHltb.gameplayMain,
            gameplayMainExtra:     gameFromHltb.gameplayMainExtra,
            gameplayCompletionist: gameFromHltb.gameplayCompletionist,
          });
        } catch {
          await getRepository(HowLongToBeatGame).save({
            game:                  stats.value.currentGame,
            startedAt:             new Date().toISOString(),
            updatedAt:             new Date().toISOString(),
            gameplayMain:          0,
            gameplayMainExtra:     0,
            gameplayCompletionist: 0,
          });
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
    const gameToShow = await getRepository(HowLongToBeatGame).findOne({ where: { game: gameInput } });
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
    const timestamps = await getRepository(HowLongToBeatGameItem).find({ where: { hltb_id: gameToShow.id } });
    const timeToBeatMain = (timestamps.filter(o => o.isMainCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset , 0) + gameToShow.offset) / constants.HOUR;
    const timeToBeatMainExtra = (timestamps.filter(o => o.isExtraCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset, 0) + gameToShow.offset) / constants.HOUR;
    const timeToBeatCompletionist = (timestamps.filter(o => o.isCompletionistCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset, 0) + gameToShow.offset) / constants.HOUR;

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
