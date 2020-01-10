import _ from 'lodash';
import XRegExp from 'xregexp';

import { isOwner, prepare, sendMessage } from '../commons';
import * as constants from '../constants';
import { command, default_permission, parser, rollback, settings } from '../decorators';
import Expects from '../expects';
import Parser from '../parser';
import { permission } from '../helpers/permissions';
import System from './_interface';

import { getRepository } from 'typeorm';
import { Cooldown as CooldownEntity, CooldownInterface, CooldownViewerInterface } from '../database/entity/cooldown';
import { User } from '../database/entity/user';
import { adminEndpoint } from '../helpers/socket';
import { Keyword } from '../database/entity/keyword';
import customCommands from './customcommands';

/*
 * !cooldown [keyword|!command] [global|user] [seconds] [true/false] - set cooldown for keyword or !command - 0 for disable, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command] [global|user]      - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command] [global|user]          - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle subscribers [keyword|!command] [global|user]     - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle followers [keyword|!command] [global|user]       - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command] [global|user]         - enable/disable specified keyword or !command cooldown
 */

class Cooldown extends System {
  @settings()
  cooldownNotifyAsWhisper = false;

  @settings()
  cooldownNotifyAsChat = true;

  constructor () {
    super();
    this.addMenu({ category: 'manage', name: 'cooldown', id: 'manage/cooldowns/list' });
  }

  sockets () {
    adminEndpoint(this.nsp, 'cooldown::save', async (dataset: CooldownInterface, cb) => {
      const item = await getRepository(CooldownEntity).save(dataset);
      cb(null, item);
    });
    adminEndpoint(this.nsp, 'cooldown::deleteById', async (id, cb) => {
      await getRepository(CooldownEntity).delete({ id });
      cb();
    });
    adminEndpoint(this.nsp, 'cooldown::getAll', async (cb) => {
      const cooldown = await getRepository(CooldownEntity).find({
        order: {
          name: 'ASC',
        },
      });
      cb(cooldown);
    });
    adminEndpoint(this.nsp, 'cooldown::getById', async (id, cb) => {
      const cooldown = await getRepository(CooldownEntity).findOne({
        where: { id },
      });
      if (!cooldown) {
        cb('Cooldown not found');
      } else {
        cb(null, cooldown);
      }
    });
  }

  @command('!cooldown')
  @default_permission(permission.CASTERS)
  async main (opts: Record<string, any>) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP_SET) as unknown as { [x: string]: string } | null;

    if (_.isNil(match)) {
      const message = await prepare('cooldowns.cooldown-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const cooldown = await getRepository(CooldownEntity).findOne({
      where: {
        name: match.command,
        type: match.type as 'global' | 'user',
      },
    });
    if (parseInt(match.seconds, 10) === 0) {
      if (cooldown) {
        await getRepository(CooldownEntity).remove(cooldown);
      }
      const message = await prepare('cooldowns.cooldown-was-unset', { type: match.type, command: match.command });
      sendMessage(message, opts.sender, opts.attr);
      return;
    }

    await getRepository(CooldownEntity).save({
      ...cooldown,
      name: match.command,
      miliseconds: parseInt(match.seconds, 10) * 1000,
      type: (match.type as 'global' | 'user'),
      timestamp: 0,
      lastTimestamp: 0,
      isErrorMsgQuiet: _.isNil(match.quiet) ? false : !!match.quiet,
      isEnabled: true,
      isOwnerAffected: false,
      isModeratorAffected: false,
      isSubscriberAffected: true,
      isFollowerAffected: true,
    });

    const message = await prepare('cooldowns.cooldown-was-set', { seconds: match.seconds, type: match.type, command: match.command });
    sendMessage(message, opts.sender, opts.attr);
  }

  @parser({ priority: constants.HIGH })
  async check (opts: Record<string, any>) {
    let data: CooldownInterface[];
    let viewer: CooldownViewerInterface | undefined;
    let timestamp, now;
    const [command, subcommand] = new Expects(opts.message)
      .command({ optional: true })
      .string({ optional: true })
      .toArray();

    if (!_.isNil(command)) { // command
      let name = subcommand ? `${command} ${subcommand}` : command;
      const parsed = await (new Parser().find(subcommand ? `${command} ${subcommand}` : command, null));
      if (parsed) {
        name = parsed.command;
      } else {
        // search in custom commands as well
        if (customCommands.enabled) {
          const foundCommands = await customCommands.find(subcommand ? `${command} ${subcommand}` : command);
          if (foundCommands.length > 0) {
            name = foundCommands[0].command.command;
          }
        }
      }

      const cooldown = await getRepository(CooldownEntity).findOne({ where: { name }, relations: ['viewers'] });
      if (!cooldown) { // command is not on cooldown -> recheck with text only
        const replace = new RegExp(`${XRegExp.escape(name)}`, 'ig');
        opts.message = opts.message.replace(replace, '');
        if (opts.message.length > 0) {
          return this.check(opts);
        } else {
          return true;
        }
      }
      data = [cooldown];
    } else { // text
      let [keywords, cooldowns] = await Promise.all([
        getRepository(Keyword).find(),
        getRepository(CooldownEntity).find({ relations: ['viewers'] }),
      ]);

      keywords = _.filter(keywords, function (o) {
        return opts.message.toLowerCase().search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword.toLowerCase()) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0;
      });

      data = [];
      _.each(keywords, (keyword) => {
        const cooldown = _.find(cooldowns, (o) => o.name.toLowerCase() === keyword.keyword.toLowerCase());
        if (keyword.enabled && cooldown) {
          data.push(cooldown);
        }
      });
    }
    if (!_.some(data, { isEnabled: true })) { // parse ok if all cooldowns are disabled
      return true;
    }

    const user = await getRepository(User).save({
      ...(await getRepository(User).findOne({ userId: opts.sender.userId })),
      userId: Number(opts.sender.userId),
      username: opts.sender.username,
      isSubscriber: typeof opts.sender.badges.subscriber !== 'undefined',
      isModerator: typeof opts.sender.badges.moderator !== 'undefined',
    });
    let result = false;
    for (const cooldown of data) {
      if ((isOwner(opts.sender) && !cooldown.isOwnerAffected) || (user.isModerator && !cooldown.isModeratorAffected) || (user.isSubscriber && !cooldown.isSubscriberAffected) || (user.isFollower && !cooldown.isFollowerAffected)) {
        result = true;
        continue;
      }

      viewer = cooldown.viewers?.find(o => o.username === opts.sender.username);
      if (cooldown.type === 'global') {
        timestamp = cooldown.timestamp ?? 0;
      } else {
        timestamp = viewer?.timestamp ?? 0;
      }
      now = Date.now();

      if (now - timestamp >= cooldown.miliseconds) {
        if (cooldown.type === 'global') {
          cooldown.lastTimestamp = timestamp;
          cooldown.timestamp = now;
        } else {
          cooldown.viewers?.push({
            ...cooldown.viewers?.find(o => o.username === opts.sender.username),
            username: opts.sender.username,
            lastTimestamp: timestamp,
            timestamp: now,
          });
        }
        await getRepository(CooldownEntity).save(cooldown);
        result = true;
        continue;
      } else {
        if (!cooldown.isErrorMsgQuiet && this.cooldownNotifyAsWhisper) {
          opts.sender['message-type'] = 'whisper'; // we want to whisp cooldown message
          const message = await prepare('cooldowns.cooldown-triggered', { command: cooldown.name, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
          await sendMessage(message, opts.sender, opts.attr);
        }
        if (!cooldown.isErrorMsgQuiet && this.cooldownNotifyAsChat) {
          opts.sender['message-type'] = 'chat';
          const message = await prepare('cooldowns.cooldown-triggered', { command: cooldown.name, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
          await sendMessage(message, opts.sender, opts.attr);
        }
        result = false;
        break; // disable _.each and updateQueue with false
      }
    }
    return result;
  }

  @rollback()
  async cooldownRollback (opts: Record<string, any>) {
    // TODO: redundant duplicated code (search of cooldown), should be unified for check and cooldownRollback
    let data: CooldownInterface[];

    const [command, subcommand] = new Expects(opts.message)
      .command({ optional: true })
      .string({ optional: true })
      .toArray();

    if (!_.isNil(command)) { // command
      let name = subcommand ? `${command} ${subcommand}` : command;
      const parsed = await (new Parser().find(subcommand ? `${command} ${subcommand}` : command));
      if (parsed) {
        name = parsed.command;
      } else {
        // search in custom commands as well
        if (customCommands.enabled) {
          const foundCommands = await customCommands.find(subcommand ? `${command} ${subcommand}` : command);
          if (foundCommands.length > 0) {
            name = foundCommands[0].command.command;
          }
        }
      }

      const cooldown = await getRepository(CooldownEntity).findOne({ where: { name }});
      if (!cooldown) { // command is not on cooldown -> recheck with text only
        const replace = new RegExp(`${XRegExp.escape(name)}`, 'ig');
        opts.message = opts.message.replace(replace, '');
        if (opts.message.length > 0) {
          return this.cooldownRollback(opts);
        } else {
          return true;
        }
      }
      data = [cooldown];
    } else { // text
      let [keywords, cooldowns] = await Promise.all([
        getRepository(Keyword).find(),
        getRepository(CooldownEntity).find({ relations: ['viewers'] }),
      ]);

      keywords = _.filter(keywords, function (o) {
        return opts.message.toLowerCase().search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword.toLowerCase()) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0;
      });

      data = [];
      _.each(keywords, (keyword) => {
        const cooldown = _.find(cooldowns, (o) => o.name.toLowerCase() === keyword.keyword.toLowerCase());
        if (keyword.enabled && cooldown) {
          data.push(cooldown);
        }
      });
    }
    if (!_.some(data, { isEnabled: true })) { // parse ok if all cooldowns are disabled
      return true;
    }

    const user = await getRepository(User).save({
      ...(await getRepository(User).findOne({ userId: opts.sender.userId })),
      userId: Number(opts.sender.userId),
      username: opts.sender.username,
      isSubscriber: typeof opts.sender.badges.subscriber !== 'undefined',
      isModerator: typeof opts.sender.badges.moderator !== 'undefined',
    });

    for (const cooldown of data) {
      if ((isOwner(opts.sender) && !cooldown.isOwnerAffected) || (user.isModerator && !cooldown.isModeratorAffected) || (user.isSubscriber && !cooldown.isSubscriberAffected) || (user.isFollower && !cooldown.isFollowerAffected)) {
        continue;
      }

      if (cooldown.type === 'global') {
        cooldown.lastTimestamp = cooldown.lastTimestamp ?? 0;
        cooldown.timestamp = cooldown.lastTimestamp ?? 0;
      } else {
        cooldown.viewers?.push({
          lastTimestamp: 0,
          timestamp: 0,
          username: opts.sender.username,
          ...cooldown.viewers?.find(o => o.username === opts.sender.username),
        });
      }
      // rollback to lastTimestamp
      await getRepository(CooldownEntity).save(cooldown);
    }
  }

  async toggle (opts: Record<string, any>, type: string) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP) as unknown as { [x: string]: string } | null;

    if (_.isNil(match)) {
      const message = await prepare('cooldowns.cooldown-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const cooldown = await getRepository(CooldownEntity).findOne({
      relations: ['viewers'],
      where: {
        name: match.command,
        type: match.type as 'global' | 'user',
      },
    });
    if (!cooldown) {
      const message = await prepare('cooldowns.cooldown-not-found', { command: match.command });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    if (type === 'type') {
      await getRepository(CooldownEntity).save({
        ...cooldown,
        [type]: cooldown[type] === 'global' ? 'user' : 'global',
      });
    } else {
      await getRepository(CooldownEntity).save({
        ...cooldown,
        [type]: !cooldown[type],
      });
    }

    let path = '';
    const status = cooldown[type] ? 'enabled' : 'disabled';

    if (type === 'isModeratorAffected') {
      path = '-for-moderators';
    }
    if (type === 'isOwnerAffected') {
      path = '-for-owners';
    }
    if (type === 'isSubscriberAffected') {
      path = '-for-subscribers';
    }
    if (type === 'isFollowerAffected') {
      path = '-for-followers';
    }
    if (type === 'isErrorMsgQuiet' || type === 'type') {
      return;
    } // those two are setable only from dashboard

    const message = await prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.name });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!cooldown toggle enabled')
  @default_permission(permission.CASTERS)
  async toggleEnabled (opts: Record<string, any>) {
    await this.toggle(opts, 'isEnabled');
  }

  @command('!cooldown toggle moderators')
  @default_permission(permission.CASTERS)
  async toggleModerators (opts: Record<string, any>) {
    await this.toggle(opts, 'isModeratorAffected');
  }

  @command('!cooldown toggle owners')
  @default_permission(permission.CASTERS)
  async toggleOwners (opts: Record<string, any>) {
    await this.toggle(opts, 'isOwnerAffected');
  }

  @command('!cooldown toggle subscribers')
  @default_permission(permission.CASTERS)
  async toggleSubscribers (opts: Record<string, any>) {
    await this.toggle(opts, 'isSubscriberAffected');
  }

  @command('!cooldown toggle followers')
  @default_permission(permission.CASTERS)
  async toggleFollowers (opts: Record<string, any>) {
    await this.toggle(opts, 'isFollowerAffected');
  }

  async toggleNotify (opts: Record<string, any>) {
    await this.toggle(opts, 'isErrorMsgQuiet');
  }
  async toggleType (opts: Record<string, any>) {
    await this.toggle(opts, 'type');
  }
}

export default new Cooldown();