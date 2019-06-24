import _ from 'lodash';

import { command, shared, settings } from '../decorators';
import Game from './_interface';
import { prepare, sendMessage, isModerator, isBroadcaster, getLocalizedName, timeout } from '../commons';

/*
 * !fightme [user] - challenge [user] to fight
 */

class FightMe extends Game {
  @shared()
  _cooldown: string = String(new Date());

  @settings()
  timeout: number = 10;
  @settings()
  cooldown: number = 0;
  @settings()
  bypassCooldownByOwnerAndMods: boolean = false;

  @settings('rewards')
  winnerWillGet: number = 0;
  @settings('rewards')
  loserWillLose: number = 0;

  @command('!fightme')
  async main (opts) {
    opts.sender['message-type'] = 'chat'; // force responses to chat
    var username;
    var userId;

    try {
      username = opts.parameters.trim().match(/^@?([\S]+)$/)[1].toLowerCase();
      userId = (await global.users.getByName(username)).id;
      opts.sender.username = opts.sender.username.toLowerCase();
    } catch (e) {
      sendMessage(global.translate('gambling.fightme.notEnoughOptions'), opts.sender, opts.attr);
      return;
    }

    if (opts.sender.username === username) {
      sendMessage(global.translate('gambling.fightme.cannotFightWithYourself'), opts.sender, opts.attr);
      return;
    }

    // check if you are challenged by user
    const challenge = await global.db.engine.findOne(this.collection.users, { key: '_users', user: username, challenging: opts.sender.username });
    const isChallenged = !_.isEmpty(challenge);
    if (isChallenged) {
      let winner = _.random(0, 1, false);
      let isMod = {
        user: await isModerator(username),
        sender: await isModerator(opts.sender.username)
      };

      // vs broadcaster
      if (isBroadcaster(opts.sender) || isBroadcaster(username)) {
        sendMessage(
          prepare('gambling.fightme.broadcaster', {
            winner: isBroadcaster(opts.sender) ? opts.sender.username : username,
            loser: isBroadcaster(opts.sender) ? username : opts.sender.username
          }),
          opts.sender);
        const isBroadcasterModCheck = isBroadcaster(opts.sender) ? isMod.user : isMod.sender;
        if (!isBroadcasterModCheck) {timeout(isBroadcaster(opts.sender) ? username : opts.sender.username, null, this.timeout);}
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
        return;
      }

      // mod vs mod
      if (isMod.user && isMod.sender) {
        sendMessage(
          prepare('gambling.fightme.bothModerators', { challenger: username }),
          opts.sender);
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
        return;
      }

      // vs mod
      if (isMod.user || isMod.sender) {
        sendMessage(
          prepare('gambling.fightme.oneModerator', {
            winner: isMod.sender ? opts.sender.username : username,
            loser: isMod.sender ? username : opts.sender.username
          }),
          opts.sender);
        timeout(isMod.sender ? username : opts.sender.username, null, this.timeout);
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
        return;
      }

      const [winnerWillGet, loserWillLose] = await Promise.all([this.winnerWillGet, this.loserWillLose]);
      global.db.engine.increment('users.points', { id: winner ? opts.sender.userId : userId }, { points: Math.abs(Number(winnerWillGet)) });
      global.db.engine.increment('users.points', { id: !winner ? opts.sender.userId : userId }, { points: -Math.abs(Number(loserWillLose)) });

      timeout(winner ? opts.sender.username : username, null, this.timeout);
      sendMessage(prepare('gambling.fightme.winner', {
        username,
        winner: winner ? username : opts.sender.username,
        loser: winner ? opts.sender.username : username
      }), opts.sender, opts.attr);
      global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
    } else {
      // check if under gambling cooldown
      const cooldown = this.cooldown;
      const isMod = await isModerator(opts.sender);
      if (new Date().getTime() - new Date(this._cooldown).getTime() < cooldown * 1000 &&
        !(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
        sendMessage(prepare('gambling.fightme.cooldown', {
          command: opts.command,
          cooldown: Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60),
          minutesName: getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60), 'core.minutes')
        }), opts.sender, opts.attr);
        return;
      }

      // save new timestamp if not bypassed
      if (!(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {this._cooldown = String(new Date());}

      const isAlreadyChallenged = !_.isEmpty(await global.db.engine.findOne(this.collection.users, { key: '_users', user: opts.sender.username, challenging: username }));
      if (!isAlreadyChallenged) {await global.db.engine.insert(this.collection.users, { key: '_users', user: opts.sender.username, challenging: username });}
      let message = prepare('gambling.fightme.challenge', { username: username, sender: opts.sender.username, command: opts.command });
      sendMessage(message, opts.sender, opts.attr);
    }
  }
}

export default FightMe;
export { FightMe };
