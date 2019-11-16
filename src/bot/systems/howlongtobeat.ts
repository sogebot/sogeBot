import { isMainThread } from '../cluster';

import * as constants from '../constants';
import System from './_interface';
import { command, default_permission } from '../decorators';
import { permission } from '../permissions';
import { HowLongToBeatService /*, HowLongToBeatEntry */ } from 'howlongtobeat';
import Expects from '../expects';
import { prepare, sendMessage } from '../commons';

import { getRepository } from 'typeorm';
import { HowLongToBeatGame } from '../database/entity/howLongToBeatGame';
import { adminEndpoint } from '../helpers/socket';

class HowLongToBeat extends System {
  interval: number = constants.SECOND * 15;
  hltbService = isMainThread ? new HowLongToBeatService() : null;

  constructor() {
    super();
    this.addMenu({ category: 'manage', name: 'howlongtobeat', id: 'manage/hltb' });

    if (isMainThread) {
      setInterval(async () => {
        if (global.api.isStreamOnline) {
          this.addToGameTimestamp();
        }
      }, this.interval);
    }
  }

  sockets() {
    adminEndpoint(this.nsp, 'hltb::getAll', async (opts, cb) => {
      cb(await getRepository(HowLongToBeatGame).find({...opts}));
    });
    adminEndpoint(this.nsp, 'hltb::save', async (dataset: HowLongToBeatGame, cb) => {
      const item = await getRepository(HowLongToBeatGame).save(dataset);
      cb(null, item);
    });
  }

  async addToGameTimestamp() {
    if (!global.api.stats.currentGame) {
      return; // skip if we don't have game
    }

    if (global.api.stats.currentGame.trim().length === 0 || global.api.stats.currentGame.trim() === 'IRL') {
      return; // skip if we have empty game
    }

    let gameToInc = await getRepository(HowLongToBeatGame).findOne({ where: { game: global.api.stats.currentGame } });
    if (gameToInc) {
      if (!gameToInc.isFinishedMain) {
        gameToInc.timeToBeatMain += this.interval;
      }
      if (!gameToInc.isFinishedCompletionist) {
        gameToInc.timeToBeatCompletionist += this.interval;
      }
    } else {
      const gamesFromHltb = await this.hltbService.search(global.api.stats.currentGame);
      const gameFromHltb = gamesFromHltb.length > 0 ? gamesFromHltb[0] : null;
      gameToInc = new HowLongToBeatGame();
      gameToInc = {
        ...gameToInc,
        game: global.api.stats.currentGame,
        gameplayMain: (gameFromHltb || { gameplayMain: 0 }).gameplayMain,
        gameplayCompletionist: (gameFromHltb || { gameplayMain: 0 }).gameplayCompletionist,
        isFinishedMain: false,
        isFinishedCompletionist: false,
        timeToBeatMain: this.interval,
        timeToBeatCompletionist: this.interval,
        imageUrl: (gameFromHltb || { imageUrl: '' }).imageUrl,
        startedAt: Date.now(),
      };
    }

    if (gameToInc.gameplayMain > 0) {
      // sve only if we have numbers from hltb (possible MP game)
      await getRepository(HowLongToBeatGame).save(gameToInc);
    }
  }

  @command('!hltb')
  @default_permission(permission.CASTERS)
  async currentGameInfo(opts: CommandOptions) {
    let [game] = new Expects(opts.parameters)
      .everything({ optional: true })
      .toArray();

    if (!game) {
      if (!global.api.stats.currentGame) {
        return; // skip if we don't have game
      } else {
        game = global.api.stats.currentGame;
      }
    }
    const gameToShow = await getRepository(HowLongToBeatGame).findOne({ where: { game } });
    if (!gameToShow) {
      await sendMessage(prepare('systems.howlongtobeat.error', { game }), opts.sender, opts.attr);
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
        game, hltbMain: gameplayMain, hltbCompletionist: gameplayCompletionist, currentMain: timeToBeatMain.toFixed(1), currentCompletionist: timeToBeatCompletionist.toFixed(1),
        percentMain: Number((timeToBeatMain / gameplayMain) * 100).toFixed(2),
        percentCompletionist: Number((timeToBeatCompletionist / gameplayCompletionist) * 100).toFixed(2),
        doneMain: finishedMain ? await prepare('systems.howlongtobeat.done') : '',
        doneCompletionist: finishedCompletionist ? await prepare('systems.howlongtobeat.done') : '',
      }), opts.sender, opts.attr);
  }
}

export default HowLongToBeat;
export { HowLongToBeat };
