import { isMainThread } from '../cluster';

import * as constants from '../constants';
import System from './_interface';
import { command, default_permission } from '../decorators';
import { permission } from '../permissions';
import { HowLongToBeatService /*, HowLongToBeatEntry */ } from 'howlongtobeat';
import Expects from '../expects';
import { prepare, sendMessage } from '../commons';

export interface Game {
  _id?: string;
  game: string;
  startedAt: number;
  isFinishedMain: boolean;
  isFinishedCompletionist: boolean;
  timeToBeatMain: number;
  timeToBeatCompletionist: number;
  gameplayMain: number;
  gameplayCompletionist: number;
  imageUrl: string;
}

class HowLongToBeat extends System {
  interval: number = constants.SECOND * 15;
  hltbService = isMainThread ? new HowLongToBeatService() : null;

  constructor() {
    super();

    global.db.engine.index(this.collection.data, [{ index: 'game', unique: true }]);
    this.addMenu({ category: 'manage', name: 'howlongtobeat', id: 'manage/hltb' });

    if (isMainThread) {
      setInterval(async () => {
        if (global.api.isStreamOnline) {
          this.addToGameTimestamp();
        }
      }, this.interval);
    }
  }

  async addToGameTimestamp() {
    if (!global.api.stats.currentGame) {
      return; // skip if we don't have game
    }

    if (global.api.stats.currentGame.trim().length === 0) {
      return; // skip if we have empty game
    }

    let gameToInc: Game = await global.db.engine.findOne(this.collection.data, { game: global.api.stats.currentGame });
    if (typeof gameToInc._id !== 'undefined') {
      delete gameToInc._id;
      if (!gameToInc.isFinishedMain) {
        gameToInc.timeToBeatMain += this.interval;
      }
      if (!gameToInc.isFinishedCompletionist) {
        gameToInc.timeToBeatCompletionist += this.interval;
      }
    } else {
      const gamesFromHltb = await this.hltbService.search(global.api.stats.currentGame);
      const gameFromHltb = gamesFromHltb.length > 0 ? gamesFromHltb[0] : null;
      gameToInc = {
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
      await global.db.engine.update(this.collection.data, { game: gameToInc.game }, gameToInc);
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
    const gameToShow: Game = await global.db.engine.findOne(this.collection.data, { game });
    if (!gameToShow || typeof gameToShow._id === 'undefined') {
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
