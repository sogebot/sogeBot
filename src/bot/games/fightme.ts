import _ from 'lodash';

import { command, settings, shared } from '../decorators';
import Game from './_interface';
import { getLocalizedName, isBroadcaster, isModerator, prepare, sendMessage, timeout } from '../commons';

import { getRepository } from 'typeorm';
import { User } from '../entity/user';

/*
 * !fightme [user] - challenge [user] to fight
 */

class FightMe extends Game {
  @shared()
  _cooldown = String(new Date());

  @settings()
  timeout = 10;
  @settings()
  cooldown = 0;
  @settings()
  bypassCooldownByOwnerAndMods = false;

  @settings('rewards')
  winnerWillGet = 0;
  @settings('rewards')
  loserWillLose = 0;

  @command('!fightme')
  async main (opts) {
    opts.sender['message-type'] = 'chat'; // force responses to chat
    let user, challenger;

    try {
      const username = opts.parameters.trim().match(/^@?([\S]+)$/)[1].toLowerCase();

      user = await getRepository(User).findOne({ where: { username: username.toLowerCase() }});
      if (!user) {
        const id = await global.users.getIdByName(username.toLowerCase());
        user = await getRepository(User).findOne({ where: { userId: id }});
        if (!user && id) {
          // if we still doesn't have user, we create new
          user = new User();
          user.userId = Number(id);
          user.username = username.toLowerCase();
          user = await getRepository(User).save(user);
        }
      }

      challenger = await getRepository(User).findOne({ where: { userId: opts.sender.userId }});
      if (!challenger) {
        // if we still doesn't have user, we create new
        challenger = new User();
        challenger.userId = opts.sender.userId;
        challenger.username = opts.sender.username.toLowerCase();
        challenger = await getRepository(User).save(challenger);
      }
    } catch (e) {
      sendMessage(global.translate('gambling.fightme.notEnoughOptions'), opts.sender, opts.attr);
      return;
    }

    if (opts.sender.username === user.username) {
      sendMessage(global.translate('gambling.fightme.cannotFightWithYourself'), opts.sender, opts.attr);
      return;
    }

    // check if you are challenged by user
    const challenge = await global.db.engine.findOne(this.collection.users, { key: '_users', user: user.username, challenging: opts.sender.username });
    const isChallenged = !_.isEmpty(challenge);
    if (isChallenged) {
      const winner = _.random(0, 1, false);
      const isMod = {
        user: await isModerator(user),
        sender: await isModerator(challenger),
      };

      // vs broadcaster
      if (isBroadcaster(opts.sender) || isBroadcaster(user.username)) {
        sendMessage(
          prepare('gambling.fightme.broadcaster', {
            winner: isBroadcaster(opts.sender) ? opts.sender.username : user.username,
            loser: isBroadcaster(opts.sender) ? user.username : opts.sender.username,
          }),
          opts.sender);
        const isBroadcasterModCheck = isBroadcaster(opts.sender) ? isMod.user : isMod.sender;
        if (!isBroadcasterModCheck) {
          timeout(isBroadcaster(opts.sender) ? user.username : opts.sender.username, null, this.timeout);
        }
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
        return;
      }

      // mod vs mod
      if (isMod.user && isMod.sender) {
        sendMessage(
          prepare('gambling.fightme.bothModerators', { challenger: user.username }),
          opts.sender);
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
        return;
      }

      // vs mod
      if (isMod.user || isMod.sender) {
        sendMessage(
          prepare('gambling.fightme.oneModerator', {
            winner: isMod.sender ? opts.sender.username : user.username,
            loser: isMod.sender ? user.username : opts.sender.username,
          }),
          opts.sender);
        timeout(isMod.sender ? user.username : opts.sender.username, null, this.timeout);
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
        return;
      }

      const [winnerWillGet, loserWillLose] = await Promise.all([this.winnerWillGet, this.loserWillLose]);
      await getRepository(User).increment({ userId: winner ? opts.sender.userId : user.userId }, 'points', Math.abs(Number(winnerWillGet)));
      await getRepository(User).decrement({ userId: !winner ? opts.sender.userId : user.userId }, 'points', Math.abs(Number(loserWillLose)));

      timeout(winner ? opts.sender.username : user.username, null, this.timeout);
      sendMessage(prepare('gambling.fightme.winner', {
        username: user.username,
        winner: winner ? user.username : opts.sender.username,
        loser: winner ? opts.sender.username : user.username,
      }), opts.sender, opts.attr);
      global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() });
    } else {
      // check if under gambling cooldown
      const cooldown = this.cooldown;
      const isMod = await isModerator(opts.sender);
      if (new Date().getTime() - new Date(this._cooldown).getTime() < cooldown * 1000
        && !(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
        sendMessage(prepare('gambling.fightme.cooldown', {
          command: opts.command,
          cooldown: Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60),
          minutesName: getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(this._cooldown).getTime())) / 1000 / 60), 'core.minutes'),
        }), opts.sender, opts.attr);
        return;
      }

      // save new timestamp if not bypassed
      if (!(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
        this._cooldown = String(new Date());
      }

      const isAlreadyChallenged = !_.isEmpty(await global.db.engine.findOne(this.collection.users, { key: '_users', user: opts.sender.username, challenging: user.username }));
      if (!isAlreadyChallenged) {
        await global.db.engine.insert(this.collection.users, { key: '_users', user: opts.sender.username, challenging: user.username });
      }
      const message = prepare('gambling.fightme.challenge', { username: user.username, sender: opts.sender.username, command: opts.command });
      sendMessage(message, opts.sender, opts.attr);
    }
  }
}

export default FightMe;
export { FightMe };
