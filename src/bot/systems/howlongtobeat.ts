import { isMainThread } from 'worker_threads';

import * as constants from '../constants';
import System from './_interface';
import { command, default_permission } from '../decorators';
import { permission } from '../permissions';
import { HowLongToBeatService /*, HowLongToBeatEntry */ } from 'howlongtobeat';
import Expects from '../expects';

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
    this.addMenu({ category: 'manage', name: 'hltb', id: 'manage/hltb' });

    if (isMainThread) {
      setInterval(async () => {
        const isOnline = await global.cache.isOnline();
        if (isOnline) {
          this.addToGameTimestamp();
        }
      }, this.interval);
    }
  }

  async addToGameTimestamp() {
    let game = await global.db.engine.findOne('api.current', { key: 'game' });
    if (!game) {
      return; // skip if we don't have game
    } else {
      game = game.value;
    }

    let gameToInc: Game = await global.db.engine.findOne(this.collection.data, { game });
    if (typeof gameToInc._id !== 'undefined') {
      delete gameToInc._id;
      if (!gameToInc.isFinishedMain) {
        gameToInc.timeToBeatMain += this.interval;
      }
      if (!gameToInc.isFinishedCompletionist) {
        gameToInc.timeToBeatCompletionist += this.interval;
      }
    } else {
      const gamesFromHltb = await this.hltbService.search(game);
      const gameFromHltb = gamesFromHltb.length > 0 ? gamesFromHltb[0] : null;
      gameToInc = {
        game,
        gameplayMain: (gameFromHltb || { gameplayMain: 0 }).gameplayMain,
        gameplayCompletionist: (gameFromHltb || { gameplayMain: 0 }).gameplayCompletionist,
        isFinishedMain: false,
        isFinishedCompletionist: false,
        timeToBeatMain: this.interval,
        timeToBeatCompletionist: this.interval,
        imageUrl: (gameFromHltb || { imageUrl: '' }).imageUrl,
        startedAt: Date.now()
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
    try {
      let [game] = new Expects(opts.parameters)
        .everything({ optional: true })
        .toArray();

      if (!game) {
        game = await global.db.engine.findOne('api.current', { key: 'game' });
        if (!game) {
          return; // skip if we don't have game
        } else {
          game = game.value;
        }
      }

      const gameToShow: Game | null = await global.db.engine.findOne(this.collection, { game });
      const timeToBeatMain = (gameToShow || { timeToBeatMain: 0 }).timeToBeatMain;
      const timeToBeatCompletionist = (gameToShow || { timeToBeatCompletionist: 0 }).timeToBeatCompletionist;
      const gameplayMain = (gameToShow || { gameplayMain: 0 }).gameplayMain;
      const gameplayCompletionist = (gameToShow || { gameplayCompletionist: 0 }).gameplayCompletionist;
      console.log({timeToBeatMain, gameplayMain, timeToBeatCompletionist, gameplayCompletionist});
    } catch (e) {
      console.log(e);
      // something went wrong
    }
  }
}

export default HowLongToBeat;
export { HowLongToBeat };
