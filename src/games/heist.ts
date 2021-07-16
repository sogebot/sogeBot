import _ from 'lodash';
import { getRepository } from 'typeorm';

import { HeistUser } from '../database/entity/heist';
import { User } from '../database/entity/user';
import { command, settings } from '../decorators';
import { onStartup } from '../decorators/on';
import Expects from '../expects.js';
import { announce, prepare } from '../helpers/commons';
import { getLocalizedName } from '../helpers/getLocalized';
import { debug, warning } from '../helpers/log.js';
import { default as pointsSystem } from '../systems/points';
import tmi from '../tmi';
import { translate } from '../translate';
import Game from './_interface';

export type Level = { name: string; winPercentage: number; payoutMultiplier: number; maxUsers: number };
export type Result = { percentage: number; message: string };

class Heist extends Game {
  dependsOn = [ pointsSystem ];

  startedAt: null | number = null;
  lastAnnouncedLevel = '';
  lastHeistTimestamp = 0;
  lastAnnouncedCops = 0;
  lastAnnouncedHeistInProgress = 0;
  lastAnnouncedStart = 0;

  @settings('options')
  showMaxUsers = 20;
  @settings('options')
  copsCooldownInMinutes = 10;
  @settings('options')
  entryCooldownInSeconds = 120;

  @settings('notifications')
  started: string = translate('games.heist.started');
  @settings('notifications')
  nextLevelMessage: string = translate('games.heist.levelMessage');
  @settings('notifications')
  maxLevelMessage: string = translate('games.heist.maxLevelMessage');
  @settings('notifications')
  copsOnPatrol: string = translate('games.heist.copsOnPatrol');
  @settings('notifications')
  copsCooldown: string = translate('games.heist.copsCooldownMessage');

  @settings('results')
  singleUserSuccess: string = translate('games.heist.singleUserSuccess');
  @settings('results')
  singleUserFailed: string = translate('games.heist.singleUserFailed');
  @settings('results')
  noUser: string = translate('games.heist.noUser');
  @settings('results')
  resultsValues: Result[] = [
    { percentage: 0, message: translate('games.heist.result.0') },
    { percentage: 33, message: translate('games.heist.result.33') },
    { percentage: 50, message: translate('games.heist.result.50') },
    { percentage: 99, message: translate('games.heist.result.99') },
    { percentage: 100, message: translate('games.heist.result.100') },
  ];

  @settings('levels')
  levelsValues: Level[] = [
    {
      'name':             translate('games.heist.levels.bankVan'),
      'winPercentage':    60,
      'payoutMultiplier': 1.5,
      'maxUsers':         5,
    },
    {
      'name':             translate('games.heist.levels.cityBank'),
      'winPercentage':    46,
      'payoutMultiplier': 1.7,
      'maxUsers':         10,
    },
    {
      'name':             translate('games.heist.levels.stateBank'),
      'winPercentage':    40,
      'payoutMultiplier': 1.9,
      'maxUsers':         20,
    },
    {
      'name':             translate('games.heist.levels.nationalReserve'),
      'winPercentage':    35,
      'payoutMultiplier': 2.1,
      'maxUsers':         30,
    },
    {
      'name':             translate('games.heist.levels.federalReserve'),
      'winPercentage':    31,
      'payoutMultiplier': 2.5,
      'maxUsers':         1000,
    },
  ];

  @onStartup()
  onStartup() {
    this.iCheckFinished();
  }

  async iCheckFinished () {
    clearTimeout(this.timeouts.iCheckFinished);

    const levels = _.orderBy(this.levelsValues, 'maxUsers', 'asc');

    // check if heist is finished
    if (!_.isNil(this.startedAt) && Date.now() - this.startedAt > (this.entryCooldownInSeconds * 1000) + 10000) {
      const users = await getRepository(HeistUser).find();
      let level = levels.find(o => o.maxUsers >= users.length || _.isNil(o.maxUsers)); // find appropriate level or max level

      if (!level) {
        if (levels.length > 0) {
          // select last level when max users are over (we have it already sorted)
          level = levels[levels.length - 1];
        } else {
          debug('heist', 'no level to check');
          return; // don't do anything if there is no level
        }
      }

      if (users.length === 0) {
        // cleanup
        this.startedAt = null;
        await getRepository(HeistUser).clear();
        this.timeouts.iCheckFinished = global.setTimeout(() => this.iCheckFinished(), 10000);
        announce(this.noUser, 'heist');
        return;
      }

      announce(this.started.replace('$bank', level.name), 'heist');
      if (users.length === 1) {
        // only one user
        const isSurvivor = _.random(0, 100, false) <= level.winPercentage;
        const user = users[0];
        const outcome = isSurvivor ? this.singleUserSuccess : this.singleUserFailed;
        global.setTimeout(async () => {
          announce(outcome.replace('$user', (tmi.showWithAt ? '@' : '') + user.username), 'heist');
        }, 5000);

        if (isSurvivor) {
          // add points to user
          await getRepository(User).increment({ userId: user.userId }, 'points', Math.floor(user.points * level.payoutMultiplier));
        }
      } else {
        const winners: string[] = [];
        for (const user of users) {
          const isSurvivor = _.random(0, 100, false) <= level.winPercentage;

          if (isSurvivor) {
            // add points to user
            await getRepository(User).increment({ userId: user.userId }, 'points', Math.floor(user.points * level.payoutMultiplier));
            winners.push(user.username);
          }
        }
        const percentage = (100 / users.length) * winners.length;
        const ordered = _.orderBy(this.resultsValues, [(o) => o.percentage], 'asc');
        const result = ordered.find(o => o.percentage >= percentage);
        global.setTimeout(async () => {
          if (!_.isNil(result)) {
            announce(result.message, 'heist');
          }
        }, 5000);
        if (winners.length > 0) {
          global.setTimeout(async () => {
            const chunk: string[][] = _.chunk(winners, this.showMaxUsers);
            const winnersList = chunk.shift() || [];
            const andXMore = winners.length - this.showMaxUsers;

            let message = await translate('games.heist.results');
            message = message.replace('$users', winnersList.map((o) => (tmi.showWithAt ? '@' : '') + o).join(', '));
            if (andXMore > 0) {
              message = message + ' ' + (await translate('games.heist.andXMore')).replace('$count', andXMore);
            }
            announce(message, 'heist');
          }, 5500);
        }
      }

      // cleanup
      this.startedAt = null;
      this.lastHeistTimestamp = Date.now();
      await getRepository(HeistUser).clear();
    }

    // check if cops done patrolling
    if (this.lastHeistTimestamp !== 0 && Date.now() - this.lastHeistTimestamp >= this.copsCooldownInMinutes * 60000) {
      this.lastHeistTimestamp = 0;
      announce(this.copsCooldown, 'heist');
    }
    this.timeouts.iCheckFinished = global.setTimeout(() => this.iCheckFinished(), 10000);
  }

  @command('!bankheist')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    const [entryCooldown, lastHeistTimestamp, copsCooldown] = await Promise.all([
      this.entryCooldownInSeconds,
      this.lastHeistTimestamp,
      this.copsCooldownInMinutes,
    ]);
    const levels = _.orderBy(this.levelsValues, 'maxUsers', 'asc');

    // is cops patrolling?
    if (Date.now() - lastHeistTimestamp < copsCooldown * 60000) {
      const minutesLeft = Number(copsCooldown - (Date.now() - lastHeistTimestamp) / 60000).toFixed(1);
      if (Date.now() - (this.lastAnnouncedCops) >= 60000) {
        this.lastAnnouncedCops = Date.now();
        return [{ response: this.copsOnPatrol.replace('$cooldown', minutesLeft + ' ' + getLocalizedName(minutesLeft, translate('core.minutes'))), ...opts }];
      }
      return [];
    }

    let newHeist = false;
    if (this.startedAt === null) { // new heist
      newHeist = true;
      this.startedAt = Date.now(); // set startedAt
      if (Date.now() - (this.lastAnnouncedStart) >= 60000) {
        this.lastAnnouncedStart = Date.now();
        announce(prepare('games.heist.entryMessage', { command: opts.command, sender: opts.sender }), 'heist');
      }
    }

    // is heist in progress?
    if (!newHeist && Date.now() - this.startedAt > entryCooldown * 1000 && Date.now() - (this.lastAnnouncedHeistInProgress) >= 60000) {
      this.lastAnnouncedHeistInProgress = Date.now();
      return [{ response: translate('games.heist.lateEntryMessage').replace('$command', opts.command), ...opts }];
    }

    let points: number | string = 0;
    try {
      points = new Expects(opts.parameters).points({ all: true }).toArray()[0] as (number | string);
    } catch (e) {
      if (!newHeist) {
        warning(`${opts.command} ${e.message}`);
        return [{ response: translate('games.heist.entryInstruction').replace('$command', opts.command), ...opts }];
      }
      return [];
    }

    const userPoints = await pointsSystem.getPointsOf(opts.sender.userId);
    points = points === 'all' ? userPoints : Number(points); // set all points
    points = points > userPoints ? userPoints : points; // bet only user points

    if (points === 0 || _.isNil(points) || _.isNaN(points)) {
      return [{ response: translate('games.heist.entryInstruction').replace('$command', opts.command), ...opts }];
    } // send entryInstruction if command is not ok

    await Promise.all([
      pointsSystem.decrement({ userId: opts.sender.userId }, Number(points)),
      getRepository(HeistUser).save({
        userId: opts.sender.userId, username: opts.sender.username, points: Number(points),
      }), // add user to heist list
    ]);

    // check how many users are in heist
    const users = await getRepository(HeistUser).find();
    const level = levels.find(o => o.maxUsers >= users.length || _.isNil(o.maxUsers));
    if (level) {
      const nextLevel = levels.find(o => o.maxUsers > level.maxUsers);
      if (this.lastAnnouncedLevel !== level.name) {
        this.lastAnnouncedLevel = level.name;
        if (nextLevel) {
          announce(this.nextLevelMessage
            .replace('$bank', level.name)
            .replace('$nextBank', nextLevel.name), 'heist');
          return [];
        } else {
          announce(this.maxLevelMessage
            .replace('$bank', level.name), 'heist');
          return [];
        }
      }
    }
    return [];
  }
}

export default new Heist();