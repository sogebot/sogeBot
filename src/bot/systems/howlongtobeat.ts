import { HowLongToBeatService } from 'howlongtobeat';
import { getRepository } from 'typeorm';

import * as constants from '../constants';
import { HowLongToBeatGame, HowLongToBeatGameItem } from '../database/entity/howLongToBeatGame';
import { command, default_permission } from '../decorators';
import { onStartup, onStreamStart } from '../decorators/on';
import Expects from '../expects';
import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '../helpers/api';
import { prepare } from '../helpers/commons';
import {
  debug, error, info, warning,
} from '../helpers/log';
import { defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import System from './_interface';

const notFoundGames = [] as string[];

class HowLongToBeat extends System {
  interval: number = constants.SECOND * 15;
  hltbService = new HowLongToBeatService();

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'manage', name: 'howlongtobeat', id: 'manage/hltb', this: this,
    });

    this.refreshImageThumbnail();

    let lastDbgMessage = '';
    setInterval(async () => {
      const isGameInNotFoundList = stats.value.currentGame && notFoundGames.includes(stats.value.currentGame);
      const dbgMessage = `streamOnline: ${isStreamOnline.value}, enabled: ${this.enabled}, currentGame: ${ stats.value.currentGame}, isGameInNotFoundList: ${isGameInNotFoundList}`;
      if (lastDbgMessage !== dbgMessage) {
        lastDbgMessage = dbgMessage;
        debug('hltb', dbgMessage);
      }
      if (isStreamOnline.value && this.enabled && !isGameInNotFoundList) {
        this.addToGameTimestamp();
      }
    }, this.interval);
  }

  @onStreamStart()
  resetNotFoundGames() {
    notFoundGames.length = 0;
  }

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(HowLongToBeatGame).find(), await getRepository(HowLongToBeatGameItem).find());
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'hltb::save', async (item, cb) => {
      try {
        cb(null, await getRepository(HowLongToBeatGame).save(item));
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'hltb::addNewGame', async (game, cb) => {
      try {
        const gameFromHltb = (await this.hltbService.search(game))[0];
        if (gameFromHltb) {
          await getRepository(HowLongToBeatGame).save({
            game:                  game,
            imageUrl:              gameFromHltb.imageUrl,
            startedAt:             Date.now(),
            gameplayMain:          gameFromHltb.gameplayMain,
            gameplayMainExtra:     gameFromHltb.gameplayMainExtra,
            gameplayCompletionist: gameFromHltb.gameplayCompletionist,
          });
        } else {
          throw new Error(`Game ${game} not found on HLTB service`);
        }
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'hltb::getGamesFromHLTB', async (game, cb) => {
      try {
        const search = await this.hltbService.search(game);
        const games = await getRepository(HowLongToBeatGame).find();
        cb(null, search
          .filter((o: any) => {
            // we need to filter already added gaems
            return !games.map(a => a.game.toLowerCase()).includes(o.name.toLowerCase());
          })
          .map((o: any) => o.name));
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      await getRepository(HowLongToBeatGame).delete({ id: String(id) });
      await getRepository(HowLongToBeatGameItem).delete({ hltb_id: String(id) });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'hltb::saveStreamChange', async (stream, cb) => {
      try {
        cb(null, await getRepository(HowLongToBeatGameItem).save(stream));
      } catch (e) {
        cb(e.stack);
      }
    });
  }

  async refreshImageThumbnail() {
    try {
      const games = await getRepository(HowLongToBeatGame).find();
      for (const game of games) {
        const gamesFromHltb = await this.hltbService.search(game.game);
        const gameFromHltb = gamesFromHltb.length > 0 ? gamesFromHltb[0] : null;
        if (gameFromHltb && gameFromHltb.imageUrl !== game.imageUrl) {
          info(`HowLongToBeat | Thumbnail for ${game.game} is updated.`);
          getRepository(HowLongToBeatGame).update({ id: game.id }, { imageUrl: gameFromHltb.imageUrl });
        }
      }
    } catch (e) {
      error(e);
    }
    setTimeout(() => this.refreshImageThumbnail(), constants.HOUR);
  }

  async addToGameTimestamp() {
    if (!stats.value.currentGame) {
      debug('hltb', 'No game being played on stream.');
      return; // skip if we don't have game
    }

    if (stats.value.currentGame.trim().length === 0 || stats.value.currentGame.trim() === 'IRL') {
      debug('hltb', 'IRL or empty game is being played on stream');
      return; // skip if we have empty game
    }

    try {
      const game = await getRepository(HowLongToBeatGame).findOneOrFail({ where: { game: stats.value.currentGame } });
      const stream = await getRepository(HowLongToBeatGameItem).findOne({ where: { hltb_id: game.id, createdAt: streamStatusChangeSince.value } });
      if (stream) {
        debug('hltb', 'Another 15s entry of this stream for ' + stats.value.currentGame);
        await getRepository(HowLongToBeatGameItem).increment({ id: stream.id }, 'timestamp', this.interval);
      } else {
        debug('hltb', 'First entry of this stream for ' + stats.value.currentGame);
        await getRepository(HowLongToBeatGameItem).save({
          createdAt: streamStatusChangeSince.value,
          hltb_id:   game.id,
          timestamp: this.interval,
        });
      }
    } catch (e) {
      if (e.name === 'EntityNotFound') {
        const gameFromHltb = (await this.hltbService.search(stats.value.currentGame))[0];
        if (gameFromHltb) {
          debug('hltb', `Game ${stats.value.currentGame} found on HLTB service`);
          // we don't care if MP game or not (user might want to track his gameplay time)
          await getRepository(HowLongToBeatGame).save({
            game:                  stats.value.currentGame,
            imageUrl:              gameFromHltb.imageUrl,
            startedAt:             Date.now(),
            gameplayMain:          gameFromHltb.gameplayMain,
            gameplayMainExtra:     gameFromHltb.gameplayMainExtra,
            gameplayCompletionist: gameFromHltb.gameplayCompletionist,
          });
          notFoundGames.splice(notFoundGames.indexOf(stats.value.currentGame), 1);
          debug('hltb', `Game ${stats.value.currentGame} found on HLTB service`);
          debug('hltb', `notFoundGames: ${notFoundGames.join(', ')}`);
        } else {
          if (!notFoundGames.includes(stats.value.currentGame)) {
            warning(`HLTB: game '${stats.value.currentGame}' was not found on HLTB service ... retrying in a while`);
            debug('hltb', `Adding game '${stats.value.currentGame}' to not found games.`);
            notFoundGames.push(stats.value.currentGame);
            // do one retry in a minute (we need to call it manually as game is already in notFoundGames)
            setTimeout(() => {
              this.addToGameTimestamp();
            }, constants.MINUTE);
          } else {
            // already retried
            warning(`HLTB: game '${stats.value.currentGame}' was not found on HLTB service ... skipping tracking this stream`);
          }
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
    const timeToBeatMain = timestamps.filter(o => o.isMainCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset , 0) + (gameToShow.offset / constants.HOUR);
    const timeToBeatMainExtra = timestamps.filter(o => o.isExtraCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset, 0) + (gameToShow.offset / constants.HOUR);
    const timeToBeatCompletionist = timestamps.filter(o => o.isCompletionistCounted).reduce((prev, cur) => prev += cur.timestamp + cur.offset, 0) + (gameToShow.offset / constants.HOUR);

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
