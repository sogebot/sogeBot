import { MINUTE } from '@sogebot/ui-helpers/constants';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import _ from 'lodash';
import { getRepository } from 'typeorm';

import { User, UserInterface } from '../database/entity/user';
import { command, settings } from '../decorators';
import { prepare } from '../helpers/commons';
import { timeout } from '../helpers/tmi';
import * as changelog from '../helpers/user/changelog.js';
import { isBroadcaster } from '../helpers/user/isBroadcaster';
import { isModerator } from '../helpers/user/isModerator';
import points from '../systems/points';
import { translate } from '../translate';
import Game from './_interface';

/*
 * !fightme [user] - challenge [user] to fight
 */

export let fightMeChallenges: {
  challenger: string; opponent: string; removeAt: number;
}[] = [];

setInterval(() => {
  fightMeChallenges = fightMeChallenges.filter(o => o.removeAt <= Date.now());
}, MINUTE / 2);

class FightMe extends Game {
  _cooldown = Date.now();

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
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    opts.sender['message-type'] = 'chat'; // force responses to chat
    let user: Readonly<Required<UserInterface>>;
    let challenger;

    try {
      const match = opts.parameters.trim().match(/^@?([\S]+)$/);
      if (!match) {
        throw new Error('Parameter match failed.');
      }
      const username = match[1].toLowerCase();
      await changelog.flush();
      user = await getRepository(User).findOneOrFail({ where: { username: username.toLowerCase() } });
      challenger = await changelog.getOrFail(opts.sender.userId);
    } catch (e: any) {
      return [{ response: translate('gambling.fightme.notEnoughOptions'), ...opts }];
    }

    if (opts.sender.userName === user.username) {
      return [{ response: translate('gambling.fightme.cannotFightWithYourself'), ...opts }];
    }

    // check if you are challenged by user
    const challenge = fightMeChallenges.find(ch => {
      return ch.opponent === opts.sender.userName
        && ch.challenger === user.username;
    });
    if (challenge) {
      const winner = _.random(0, 1, false);
      const isMod = {
        user:   isModerator(user),
        sender: isModerator(challenger),
      };

      // vs broadcaster
      if (isBroadcaster(opts.sender) || isBroadcaster(user.username)) {
        const isBroadcasterModCheck = isBroadcaster(opts.sender) ? isMod.user : isMod.sender;
        if (!isBroadcasterModCheck) {
          timeout(isBroadcaster(opts.sender) ? user.username : opts.sender.userName, this.timeout, isBroadcaster(opts.sender) ? isMod.user : isMod.sender);
        }
        fightMeChallenges = fightMeChallenges.filter(ch => {
          return !(ch.opponent === opts.sender.userName
            && ch.challenger === user.username);
        });
        return [{
          response: prepare('gambling.fightme.broadcaster', {
            winner: isBroadcaster(opts.sender) ? opts.sender.userName : user.username,
            loser:  isBroadcaster(opts.sender) ? user.username : opts.sender.userName,
          }), ...opts,
        }];
      }

      // mod vs mod
      if (isMod.user && isMod.sender) {
        fightMeChallenges = fightMeChallenges.filter(ch => {
          return !(ch.opponent === opts.sender.userName
            && ch.challenger === user.username);
        });
        return [{ response: prepare('gambling.fightme.bothModerators', { challenger: user.username }), ...opts }];
      }

      // vs mod
      if (isMod.user || isMod.sender) {
        timeout(isMod.sender ? user.username : opts.sender.userName, this.timeout, false);
        fightMeChallenges = fightMeChallenges.filter(ch => {
          return !(ch.opponent === opts.sender.userName
            && ch.challenger === user.username);
        });
        return [{
          response: prepare('gambling.fightme.oneModerator', {
            winner: isMod.sender ? opts.sender.userName : user.username,
            loser:  isMod.sender ? user.username : opts.sender.userName,
          }), ...opts,
        }];
      }

      const [winnerWillGet, loserWillLose] = await Promise.all([this.winnerWillGet, this.loserWillLose]);
      changelog.increment(winner ? opts.sender.userId : user.userId, { points: Math.abs(Number(winnerWillGet)) });
      await points.decrement({ userId: !winner ? opts.sender.userId : user.userId }, Math.abs(Number(loserWillLose)));

      timeout(winner ? opts.sender.userName : user.username, this.timeout, false);
      fightMeChallenges = fightMeChallenges.filter(ch => {
        return !(ch.opponent === opts.sender.userName
          && ch.challenger === user.username);
      });
      return [{
        response: prepare('gambling.fightme.winner', {
          username: user.username,
          winner:   winner ? user.username : opts.sender.userName,
          loser:    winner ? opts.sender.userName : user.username,
        }), ...opts,
      }];
    } else {
      // check if under gambling cooldown
      const cooldown = this.cooldown;
      const isMod = isModerator(opts.sender);
      if (Date.now() - new Date(this._cooldown).getTime() < cooldown * 1000
        && !(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
        return [{
          response: prepare('gambling.fightme.cooldown', {
            command:     opts.command,
            cooldown:    Math.round(((cooldown * 1000) - (Date.now() - new Date(this._cooldown).getTime())) / 1000 / 60),
            minutesName: getLocalizedName(Math.round(((cooldown * 1000) - (Date.now() - new Date(this._cooldown).getTime())) / 1000 / 60), translate('core.minutes')),
          }), ...opts,
        }];
      }

      // save new timestamp if not bypassed
      if (!(this.bypassCooldownByOwnerAndMods && (isMod || isBroadcaster(opts.sender)))) {
        this._cooldown = Date.now();
      }

      const isAlreadyChallenged = fightMeChallenges.find(ch => {
        return ch.challenger === opts.sender.userName
          && ch.opponent === user.username;
      });
      if (!isAlreadyChallenged) {
        fightMeChallenges.push({
          challenger: opts.sender.userName,
          opponent:   user.username,
          removeAt:   Date.now() + (2 * MINUTE),
        });
      } else {
        isAlreadyChallenged.removeAt = Date.now() + (2 * MINUTE);
      }
      const response = prepare('gambling.fightme.challenge', {
        username: user.username, sender: opts.sender.userName, command: opts.command,
      });
      return [{ response, ...opts }];
    }
  }
}

export default new FightMe();
