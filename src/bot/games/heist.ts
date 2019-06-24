import _ from 'lodash';
import { isMainThread } from 'worker_threads';

import Expects from '../expects.js';
import Game from './_interface';
import { command, shared, settings } from '../decorators';
import { sendMessage, getOwner, getLocalizedName } from '../commons.js';

class Heist extends Game {
  dependsOn = [ 'systems.points' ];

  @shared()
  startedAt: null | number = null;
  @shared()
  lastAnnouncedLevel: string = '';
  @shared()
  lastHeistTimestamp: number = 0;
  @shared()
  lastAnnouncedCops: number = 0;
  @shared()
  lastAnnouncedHeistInProgress: number = 0;
  @shared()
  lastAnnouncedStart: number = 0;

  @settings('options')
  showMaxUsers: number = 20;
  @settings('options')
  copsCooldownInMinutes: number = 10;
  @settings('options')
  entryCooldownInSeconds: number = 120;

  @settings('notifications')
  started: string = global.translate('games.heist.started');
  @settings('notifications')
  nextLevelMessage: string = global.translate('games.heist.levelMessage');
  @settings('notifications')
  maxLevelMessage: string = global.translate('games.heist.maxLevelMessage');
  @settings('notifications')
  copsOnPatrol: string = global.translate('games.heist.copsOnPatrol');
  @settings('notifications')
  copsCooldown: string = global.translate('games.heist.copsCooldownMessage');

  @settings('results')
  singleUserSuccess: string = global.translate('games.heist.singleUserSuccess');
  @settings('results')
  singleUserFailed: string = global.translate('games.heist.singleUserFailed');
  @settings('results')
  noUser: string = global.translate('games.heist.noUser');
  @settings('results')
  results: { percentage: number; message: string} [] = [
    { percentage: 0, message: global.translate('games.heist.result.0') },
    { percentage: 33, message: global.translate('games.heist.result.33') },
    { percentage: 50, message: global.translate('games.heist.result.50') },
    { percentage: 99, message: global.translate('games.heist.result.99') },
    { percentage: 100, message: global.translate('games.heist.result.100') }
  ];

  @settings('levels')
  levels: { name: string; winPercentage: number; payoutMultiplier: number; maxUsers: number }[] = [
    {
      'name': global.translate('games.heist.levels.bankVan'),
      'winPercentage': 60,
      'payoutMultiplier': 1.5,
      'maxUsers': 5
    },
    {
      'name': global.translate('games.heist.levels.cityBank'),
      'winPercentage': 46,
      'payoutMultiplier': 1.7,
      'maxUsers': 10
    },
    {
      'name': global.translate('games.heist.levels.stateBank'),
      'winPercentage': 40,
      'payoutMultiplier': 1.9,
      'maxUsers': 20
    },
    {
      'name': global.translate('games.heist.levels.nationalReserve'),
      'winPercentage': 35,
      'payoutMultiplier': 2.1,
      'maxUsers': 30
    },
    {
      'name': global.translate('games.heist.levels.federalReserve'),
      'winPercentage': 31,
      'payoutMultiplier': 2.5,
      'maxUsers': 1000
    }
  ];

  constructor () {
    super();

    if (isMainThread) {this.timeouts['iCheckFinished'] = global.setTimeout(() => this.iCheckFinished(), 10000);} // wait for proper config startup
  }

  async iCheckFinished () {
    clearTimeout(this.timeouts['iCheckFinished']);

    let [startedAt, entryCooldown, lastHeistTimestamp, copsCooldown, started] = await Promise.all([
      this.startedAt,
      this.entryCooldownInSeconds,
      this.lastHeistTimestamp,
      this.copsCooldownInMinutes,
      this.started
    ]);
    let levels = _.orderBy(this.levels, 'maxUsers', 'asc');

    // check if heist is finished
    if (!_.isNil(startedAt) && _.now() - startedAt > (entryCooldown * 1000) + 10000) {
      let users = await global.db.engine.find(this.collection.users);
      let level = _.find(levels, (o) => o.maxUsers >= users.length || _.isNil(o.maxUsers)); // find appropriate level or max level

      if (!level) {
        return; // don't do anything if there is no level
      }

      const userObj = await global.users.getByName(getOwner());
      if (users.length === 0) {
        sendMessage(this.noUser, {
          username: userObj.username,
          displayName: userObj.displayName || userObj.username,
          userId: userObj.id,
          emotes: [],
          badges: {},
          'message-type': 'chat'
        });
        // cleanup
        this.startedAt = null;
        await global.db.engine.remove(this.collection.users, {});
        this.timeouts['iCheckFinished'] = global.setTimeout(() => this.iCheckFinished(), 10000);
        return;
      }

      sendMessage(started.replace('$bank', level.name), {
        username: userObj.username,
        displayName: userObj.displayName || userObj.username,
        userId: userObj.id,
        emotes: [],
        badges: {},
        'message-type': 'chat'
      });

      if (users.length === 1) {
        // only one user
        let isSurvivor = _.random(0, 100, false) <= level['winPercentage'];
        let user = users[0];
        let outcome = isSurvivor ? this.singleUserSuccess : this.singleUserFailed;
        global.setTimeout(async () => { sendMessage(outcome.replace('$user', (global.tmi.showWithAt ? '@' : '') + user.username), {
          username: userObj.username,
          displayName: userObj.displayName || userObj.username,
          userId: userObj.id,
          emotes: [],
          badges: {},
          'message-type': 'chat'
        }); }, 5000);

        if (isSurvivor) {
          // add points to user
          let points = parseInt((await global.db.engine.findOne(this.collection.users, { username: user.username })).points, 10);
          await global.db.engine.increment('users.points', { id: user.id }, { points: Number(points * level.payoutMultiplier).toFixed() });
        }
      } else {
        let winners: string[] = [];
        for (let user of users) {
          let isSurvivor = _.random(0, 100, false) <= level.winPercentage;

          if (isSurvivor) {
            // add points to user
            let points = parseInt((await global.db.engine.findOne(this.collection.users, { username: user.username })).points, 10);
            await global.db.engine.increment('users.points', { id: user.id }, { points: Number(points * level.payoutMultiplier).toFixed() });
            winners.push(user.username);
          }
        }
        let percentage = (100 / users.length) * winners.length;
        let ordered = _.orderBy(this.results, [(o) => o.percentage], 'asc');
        let result = _.find(ordered, (o) => o.percentage >= percentage);
        global.setTimeout(async () => { sendMessage(_.isNil(result) ? '' : result.message, {
          username: userObj.username,
          displayName: userObj.displayName || userObj.username,
          userId: userObj.id,
          emotes: [],
          badges: {},
          'message-type': 'chat'
        }); }, 5000);
        if (winners.length > 0) {
          global.setTimeout(async () => {
            const chunk: string[][] = _.chunk(winners, this.showMaxUsers);
            let winnersList = chunk.shift() || [];
            let andXMore = _.flatten(winners).length;

            let message = await global.translate('games.heist.results');
            message = message.replace('$users', winnersList.map((o) => (global.tmi.showWithAt ? '@' : '') + o).join(', '));
            if (andXMore > 0) {message = message + ' ' + (await global.translate('games.heist.andXMore')).replace('$count', andXMore);}
            sendMessage(message, {
              username: userObj.username,
              displayName: userObj.displayName || userObj.username,
              userId: userObj.id,
              emotes: [],
              badges: {},
              'message-type': 'chat'
            });
          }, 5500);
        }
      }

      // cleanup
      this.startedAt = null;
      this.lastHeistTimestamp = _.now();
      await global.db.engine.remove(this.collection.users, {});
    }

    // check if cops done patrolling
    if (lastHeistTimestamp !== 0 && _.now() - lastHeistTimestamp >= copsCooldown * 60000) {
      this.lastHeistTimestamp = 0;
      const userObj = await global.users.getByName(getOwner());
      sendMessage((this.copsCooldown), {
        username: userObj.username,
        displayName: userObj.displayName || userObj.username,
        userId: userObj.id,
        emotes: [],
        badges: {},
        'message-type': 'chat'
      });
    }
    this.timeouts['iCheckFinished'] = global.setTimeout(() => this.iCheckFinished(), 10000);
  }

  @command('!bankheist')
  async main (opts) {
    const expects = new Expects();

    let [entryCooldown, lastHeistTimestamp, copsCooldown] = await Promise.all([
      this.entryCooldownInSeconds,
      this.lastHeistTimestamp,
      this.copsCooldownInMinutes
    ]);
    let levels = _.orderBy(this.levels, 'maxUsers', 'asc');

    // is cops patrolling?
    if (_.now() - lastHeistTimestamp < copsCooldown * 60000) {
      let minutesLeft = Number(copsCooldown - (_.now() - lastHeistTimestamp) / 60000).toFixed(1);
      if (_.now() - (this.lastAnnouncedCops) >= 60000) {
        this.lastAnnouncedCops = _.now();
        sendMessage(
          (this.copsOnPatrol)
            .replace('$cooldown', minutesLeft + ' ' + getLocalizedName(minutesLeft, 'core.minutes')), opts.sender, opts.attr);
      }
      return;
    }

    let newHeist = false;
    if (this.startedAt === null) { // new heist
      newHeist = true;
      this.startedAt = _.now(); // set startedAt
      await global.db.engine.update(this.collection.data, { key: 'startedAt' }, { value: this.startedAt });
      if (_.now() - (this.lastAnnouncedStart) >= 60000) {
        this.lastAnnouncedStart = _.now();
        sendMessage((await global.translate('games.heist.entryMessage')).replace('$command', opts.command), opts.sender);
      }
    }

    // is heist in progress?
    if (!newHeist && _.now() - this.startedAt > entryCooldown * 1000 && _.now() - (this.lastAnnouncedHeistInProgress) >= 60000) {
      this.lastAnnouncedHeistInProgress = _.now();
      sendMessage(
        (await global.translate('games.heist.lateEntryMessage')).replace('$command', opts.command), opts.sender, opts.attr);
      return;
    }

    let points;
    try {
      points = expects.check(opts.parameters).points().toArray()[0];
    } catch (e) {
      if (!newHeist) {
        sendMessage(
          (await global.translate('games.heist.entryInstruction')).replace('$command', opts.command), opts.sender, opts.attr);
        global.log.warning(`${opts.command} ${e.message}`);
      }
      return;
    }

    points = points === 'all' && !_.isNil(await global.systems.points.getPointsOf(opts.sender.userId)) ? await global.systems.points.getPointsOf(opts.sender.userId) : parseInt(points, 10); // set all points
    points = points > await global.systems.points.getPointsOf(opts.sender.userId) ? await global.systems.points.getPointsOf(opts.sender.userId) : points; // bet only user points

    if (points === 0 || _.isNil(points) || _.isNaN(points)) {
      sendMessage(
        (await global.translate('games.heist.entryInstruction')).replace('$command', opts.command), opts.sender, opts.attr);
      return;
    } // send entryInstruction if command is not ok

    await Promise.all([
      global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: parseInt(points, 10) * -1 }), // remove points from user
      global.db.engine.update(this.collection.users, { id: opts.sender.userId }, { username: opts.sender.username, points: points }) // add user to heist list
    ]);

    // check how many users are in heist
    let users = await global.db.engine.find(this.collection.users);
    let level = _.find(levels, (o) => o.maxUsers >= users.length || _.isNil(o.maxUsers));
    if (level) {
      let nextLevel = _.find(levels, (o) => {
        if (level) {
          return o.maxUsers > level.maxUsers;
        } else {
          return true;
        }
      });

      if (this.lastAnnouncedLevel !== level.name) {
        this.lastAnnouncedLevel = level.name;
        if (nextLevel) {
          sendMessage(this.nextLevelMessage
            .replace('$bank', level.name)
            .replace('$nextBank', nextLevel.name), opts.sender, opts.attr);
        } else {
          sendMessage(this.maxLevelMessage
            .replace('$bank', level.name), opts.sender, opts.attr);
        }
      }
    }
  }
}

export default Heist;
export { Heist };