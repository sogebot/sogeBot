import { isMainThread } from '../cluster';

import * as constants from '../constants';
import System from './_interface';
import { command, default_permission } from '../decorators';
import { permission } from '../helpers/permissions';
import { HowLongToBeatService /*, HowLongToBeatEntry */ } from 'howlongtobeat';
import Expects from '../expects';
import { prepare, sendMessage } from '../commons';

import { getRepository } from 'typeorm';
import { HowLongToBeatGame, HowLongToBeatGameInterface } from '../database/entity/howLongToBeatGame';
import { adminEndpoint } from '../helpers/socket';
import api from '../api';
import { error, info } from '../helpers/log';

class HowLongToBeat extends System {
  interval: number = constants.SECOND * 15;
  hltbService = isMainThread ? new HowLongToBeatService() : null;

  constructor() {
    super();
    this.addMenu({ category: 'manage', name: 'howlongtobeat', id: 'manage/hltb' });

    if (isMainThread) {
      this.refreshImageThumbnail();
      setInterval(async () => {
        if (api.isStreamOnline) {
          this.addToGameTimestamp();
        }
      }, this.interval);
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'hltb::getAll', async (opts, cb) => {
      try {
        cb(null, await getRepository(HowLongToBeatGame).find({...opts}));
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'hltb::save', async (dataset: HowLongToBeatGameInterface, cb) => {
      try {
        const item = await getRepository(HowLongToBeatGame).save(dataset);
        cb(null, item);
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
        if (gameFromHltb && game.imageUrl !== gameFromHltb.imageUrl) {
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
    if (!api.stats.currentGame) {
      return; // skip if we don't have game
    }

    if (api.stats.currentGame.trim().length === 0 || api.stats.currentGame.trim() === 'IRL') {
      return; // skip if we have empty game
    }

    const gameToInc = await getRepository(HowLongToBeatGame).findOne({ where: { game: api.stats.currentGame } });
    if (gameToInc) {
      const timeToBeatMain = gameToInc.isFinishedMain ? gameToInc.timeToBeatMain + this.interval : gameToInc.timeToBeatMain;
      const timeToBeatCompletionist = gameToInc.isFinishedCompletionist ? gameToInc.timeToBeatCompletionist + this.interval : gameToInc.timeToBeatCompletionist;
      if (gameToInc.gameplayMain > 0) {
        // save only if we have numbers from hltb (possible MP game)
        await getRepository(HowLongToBeatGame).save({...gameToInc, timeToBeatCompletionist, timeToBeatMain});
      }
    } else {
      const gamesFromHltb = await this.hltbService.search(api.stats.currentGame);
      const gameFromHltb = gamesFromHltb.length > 0 ? gamesFromHltb[0] : null;
      const game = {
        game: api.stats.currentGame,
        gameplayMain: (gameFromHltb || { gameplayMain: 0 }).gameplayMain,
        gameplayCompletionist: (gameFromHltb || { gameplayMain: 0 }).gameplayCompletionist,
        isFinishedMain: false,
        isFinishedCompletionist: false,
        timeToBeatMain: this.interval,
        timeToBeatCompletionist: this.interval,
        imageUrl: (gameFromHltb || { imageUrl: '' }).imageUrl,
        startedAt: Date.now(),
      };
      if (game.gameplayMain > 0) {
        // save only if we have numbers from hltb (possible MP game)
        await getRepository(HowLongToBeatGame).save(game);
      }
    }
  }

  @command('!hltb')
  @default_permission(permission.CASTERS)
  async currentGameInfo(opts: CommandOptions, retry = false) {
    let [gameInput] = new Expects(opts.parameters)
      .everything({ optional: true })
      .toArray();

    if (!gameInput) {
      if (!api.stats.currentGame) {
        return; // skip if we don't have game
      } else {
        gameInput = api.stats.currentGame;
      }
    }
    const gameToShow = await getRepository(HowLongToBeatGame).findOne({ where: { game: gameInput } });
    if (!gameToShow && !retry) {
      if (!api.stats.currentGame) {
        this.currentGameInfo(opts, true);
        return; // skip if we don't have game
      }

      if (api.stats.currentGame.trim().length === 0 || api.stats.currentGame.trim() === 'IRL') {
        this.currentGameInfo(opts, true);
        return; // skip if we have empty game
      }
      const gamesFromHltb = await this.hltbService.search(api.stats.currentGame);
      const gameFromHltb = gamesFromHltb.length > 0 ? gamesFromHltb[0] : null;
      const game = {
        game: api.stats.currentGame,
        gameplayMain: (gameFromHltb || { gameplayMain: 0 }).gameplayMain,
        gameplayCompletionist: (gameFromHltb || { gameplayMain: 0 }).gameplayCompletionist,
        isFinishedMain: false,
        isFinishedCompletionist: false,
        timeToBeatMain: 0,
        timeToBeatCompletionist: 0,
        imageUrl: (gameFromHltb || { imageUrl: '' }).imageUrl,
        startedAt: Date.now(),
      };
      if (game.gameplayMain > 0) {
        // save only if we have numbers from hltb (possible MP game)
        await getRepository(HowLongToBeatGame).save(game);
      }
      this.currentGameInfo(opts, true);
      return;
    } else if (!gameToShow) {
      await sendMessage(prepare('systems.howlongtobeat.error', { game: gameInput }), opts.sender, opts.attr);
      return;
    }
    const timeToBeatMain = gameToShow.timeToBeatMain / constants.HOUR;
    const timeToBeatCompletionist = gameToShow.timeToBeatCompletionist / constants.HOUR;
    const gameplayMain = gameToShow.gameplayMain;
    const gameplayCompletionist = gameToShow.gameplayCompletionist;
    const finishedMain = gameToShow.isFinishedMain;
    const finishedCompletionist = gameToShow.isFinishedCompletionist;
    await sendMessage(
      prepare('systems.howlongtobeat.game', {
        game: gameInput, hltbMain: gameplayMain, hltbCompletionist: gameplayCompletionist, currentMain: timeToBeatMain.toFixed(1), currentCompletionist: timeToBeatCompletionist.toFixed(1),
        percentMain: Number((timeToBeatMain / gameplayMain) * 100).toFixed(2),
        percentCompletionist: Number((timeToBeatCompletionist / gameplayCompletionist) * 100).toFixed(2),
        doneMain: finishedMain ? prepare('systems.howlongtobeat.done') : '',
        doneCompletionist: finishedCompletionist ? prepare('systems.howlongtobeat.done') : '',
      }), opts.sender, opts.attr);
  }
}

export default new HowLongToBeat();
