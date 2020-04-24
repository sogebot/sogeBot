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
import { Cooldown as CooldownEntity, CooldownInterface, CooldownViewer, CooldownViewerInterface } from '../database/entity/cooldown';
import { User } from '../database/entity/user';
import { adminEndpoint } from '../helpers/socket';
import { Keyword } from '../database/entity/keyword';
import customCommands from './customcommands';
import { debug } from '../helpers/log';

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
      try {
        const item = await getRepository(CooldownEntity).save(dataset);
        cb(null, item);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'cooldown::deleteById', async (id, cb) => {
      await getRepository(CooldownEntity).delete({ id });
      cb();
    });
    adminEndpoint(this.nsp, 'cooldown::getAll', async (cb) => {
      try {
        const cooldown = await getRepository(CooldownEntity).find({
          order: {
            name: 'ASC',
          },
        });
        cb(null, cooldown);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'cooldown::getById', async (id, cb) => {
      try {
        const cooldown = await getRepository(CooldownEntity).findOne({
          where: { id },
        });
        if (!cooldown) {
          cb('Cooldown not found');
        } else {
          cb(null, cooldown);
        }
      } catch (e) {
        cb(e.stack);
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
    try {
      let data: CooldownInterface[];
      let viewer: CooldownViewerInterface | undefined;
      let timestamp, now;
      const [cmd, subcommand] = new Expects(opts.message)
        .command({ optional: true })
        .string({ optional: true })
        .toArray();

      if (!_.isNil(cmd)) { // command
        let name: string = subcommand ? `${cmd} ${subcommand}` : cmd;
        let isFound = false;

        const parsed = await (new Parser().find(subcommand ? `${cmd} ${subcommand}` : cmd, null));
        if (parsed) {
          debug('cooldown.check', `Command found ${parsed.command}`);
          name = parsed.command;
          isFound = true;
        } else {
          // search in custom commands as well
          if (customCommands.enabled) {
            const foundCommands = await customCommands.find(subcommand ? `${cmd} ${subcommand}` : cmd);
            if (foundCommands.length > 0) {
              name = foundCommands[0].command.command;
              isFound = true;
            }
          }
        }

        if (!isFound) {
          debug('cooldown.check', `'${name}' not found, reverting to simple '${cmd}'`);
          name = cmd; // revert to basic command if nothing was found
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

      const user = await getRepository(User).findOne({ userId: Number(opts.sender.userId) });
      if (!user) {
        return true;
      }
      let result = false;
      for (const cooldown of data) {
        if ((isOwner(opts.sender) && !cooldown.isOwnerAffected) || (user.isModerator && !cooldown.isModeratorAffected) || (user.isSubscriber && !cooldown.isSubscriberAffected) || (user.isFollower && !cooldown.isFollowerAffected)) {
          result = true;
          continue;
        }

        for (const item of cooldown.viewers?.filter(o => o.userId === Number(opts.sender.userId)) ?? []) {
          if (!viewer || viewer.timestamp < item.timestamp) {
            viewer = {...item};
          } else {
            // remove duplicate
            cooldown.viewers = cooldown.viewers?.filter(o => o.id !== item.id);
          }
        }
        debug('cooldown.db', viewer ?? `${opts.sender.username}#${opts.sender.userId} not found in cooldown list`);
        if (cooldown.type === 'global') {
          timestamp = cooldown.timestamp ?? 0;
        } else {
          timestamp = viewer?.timestamp ?? 0;
        }
        now = Date.now();

        if (now - timestamp >= cooldown.miliseconds) {
          if (cooldown.type === 'global') {
            await getRepository(CooldownEntity).save({
              ...cooldown,
              lastTimestamp: timestamp,
              timestamp: now,
            });
          } else {
            debug('cooldown.check', `${opts.sender.username}#${opts.sender.userId} added to cooldown list.`);
            await getRepository(CooldownViewer).insert({
              cooldown, userId: Number(opts.sender.userId), lastTimestamp: timestamp,  timestamp: now,
            });
          }
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
          debug('cooldown.check', `${opts.sender.username}#${opts.sender.userId} have ${cooldown.name} on cooldown, remaining ${Math.ceil((cooldown.miliseconds - now + timestamp) / 1000)}s`);
          result = false;
          break; // disable _.each and updateQueue with false
        }
      }
      return result;
    } catch (e) {
      return false;
    }
  }

  @rollback()
  async cooldownRollback (opts: Record<string, any>) {
    // TODO: redundant duplicated code (search of cooldown), should be unified for check and cooldownRollback
    let data: CooldownInterface[];

    const [cmd, subcommand] = new Expects(opts.message)
      .command({ optional: true })
      .string({ optional: true })
      .toArray();

    if (!_.isNil(cmd)) { // command
      let name = subcommand ? `${cmd} ${subcommand}` : cmd;
      let isFound = false;

      const parsed = await (new Parser().find(subcommand ? `${cmd} ${subcommand}` : cmd));
      if (parsed) {
        debug('cooldown.revert', `Command found ${parsed.command}`);
        name = parsed.command;
        isFound = true;
      } else {
        // search in custom commands as well
        if (customCommands.enabled) {
          const foundCommands = await customCommands.find(subcommand ? `${cmd} ${subcommand}` : cmd);
          if (foundCommands.length > 0) {
            name = foundCommands[0].command.command;
            isFound = true;
          }
        }
      }

      if (!isFound) {
        debug('cooldown.revert', `'${name}' not found, reverting to simple '${cmd}'`);
        name = command; // revert to basic command if nothing was found
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

    const user = await getRepository(User).findOne({ userId: Number(opts.sender.userId) });
    if (!user) {
      return true;
    }

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
          userId: Number(opts.sender.userId),
          ...cooldown.viewers.find(o => o.userId === Number(opts.sender.userId)),
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
    const status = !cooldown[type] ? 'enabled' : 'disabled';

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