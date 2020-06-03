import _ from 'lodash';
import XRegExp from 'xregexp';

import { isOwner, parserReply, prepare } from '../commons';
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

const cache: { id: string; cooldowns: CooldownInterface[] }[] = [];

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
    this.addMenu({ category: 'manage', name: 'cooldown', id: 'manage/cooldowns/list', this: this });
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
    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      await getRepository(CooldownEntity).delete({ id: String(id) });
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
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
    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
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
  async main (opts: CommandOptions) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP_SET) as unknown as { [x: string]: string } | null;

    if (_.isNil(match)) {
      return [{ response: prepare('cooldowns.cooldown-parse-failed'), ...opts }];
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
      return [{ response: prepare('cooldowns.cooldown-was-unset', { type: match.type, command: match.command }), ...opts }];
    }

    await getRepository(CooldownEntity).save({
      ...cooldown,
      name: match.command,
      miliseconds: parseInt(match.seconds, 10) * 1000,
      type: (match.type as 'global' | 'user'),
      timestamp: 0,
      isErrorMsgQuiet: _.isNil(match.quiet) ? false : !!match.quiet,
      isEnabled: true,
      isOwnerAffected: false,
      isModeratorAffected: false,
      isSubscriberAffected: true,
      isFollowerAffected: true,
    });
    return [{ response: prepare('cooldowns.cooldown-was-set', { seconds: match.seconds, type: match.type, command: match.command }), ...opts }];
  }

  @parser({ priority: constants.HIGH })
  async check (opts: ParserOptions): Promise<boolean> {
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
          const message = opts.message.replace(replace, '').trim();
          if (message.length > 0 && opts.message !== message) {
            debug('cooldown.check', `Command ${name} not on cooldown, checking: ${message}`);
            return this.check({...opts, message});
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

      const affectedCooldowns: CooldownInterface[] = [];
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
              timestamp: now,
            });
          } else {
            debug('cooldown.check', `${opts.sender.username}#${opts.sender.userId} added to cooldown list.`);
            await getRepository(CooldownViewer).insert({
              cooldown, userId: Number(opts.sender.userId), timestamp: now,
            });
          }
          affectedCooldowns.push({
            ...cooldown,
            timestamp: now,
          });
          result = true;
          continue;
        } else {
          if (!cooldown.isErrorMsgQuiet && this.cooldownNotifyAsWhisper) {
            opts.sender['message-type'] = 'whisper'; // we want to whisp cooldown message
            const response = prepare('cooldowns.cooldown-triggered', { command: cooldown.name, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
            parserReply(response, opts);
          }
          if (!cooldown.isErrorMsgQuiet && this.cooldownNotifyAsChat) {
            opts.sender['message-type'] = 'chat';
            const response = prepare('cooldowns.cooldown-triggered', { command: cooldown.name, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
            parserReply(response, opts);
          }
          debug('cooldown.check', `${opts.sender.username}#${opts.sender.userId} have ${cooldown.name} on cooldown, remaining ${Math.ceil((cooldown.miliseconds - now + timestamp) / 1000)}s`);
          result = false;
          break; // disable _.each and updateQueue with false
        }
      }

      // cache cooldowns - keep only latest 50
      cache.push({ id: opts.id, cooldowns: affectedCooldowns });
      while(cache.length > 50) {
        cache.shift();
      }
      return result;
    } catch (e) {
      return false;
    }
  }

  @rollback()
  async cooldownRollback (opts: ParserOptions): Promise<boolean> {
    const cached = cache.find(o => o.id === opts.id);
    if (cached) {
      for (const cooldown of cached.cooldowns) {
        if (cooldown.type === 'global') {
          cooldown.timestamp = 0; // we just revert to 0 as user were able to run it
        } else {
          cooldown.viewers?.push({
            timestamp: 0,
            userId: Number(opts.sender.userId),
            ...cooldown.viewers.find(o => o.userId === Number(opts.sender.userId)),
          });
        }
        // rollback timestamp
        await getRepository(CooldownEntity).save(cooldown);
      }
    }
    cache.splice(cache.findIndex(o => o.id === opts.id), 1);
    return true;
  }

  async toggle (opts: CommandOptions, type: 'isEnabled' | 'isModeratorAffected' | 'isOwnerAffected' | 'isSubscriberAffected' | 'isFollowerAffected' | 'isErrorMsgQuiet' | 'type') {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP) as unknown as { [x: string]: string } | null;

    if (_.isNil(match)) {
      return [{ response: prepare('cooldowns.cooldown-parse-failed'), ...opts }];
    }

    const cooldown = await getRepository(CooldownEntity).findOne({
      relations: ['viewers'],
      where: {
        name: match.command,
        type: match.type as 'global' | 'user',
      },
    });
    if (!cooldown) {
      return [{ response: prepare('cooldowns.cooldown-not-found', { command: match.command }), ...opts }];
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

    return [{ response: prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.name }), ...opts }];
  }

  @command('!cooldown toggle enabled')
  @default_permission(permission.CASTERS)
  async toggleEnabled (opts: CommandOptions) {
    return this.toggle(opts, 'isEnabled');
  }

  @command('!cooldown toggle moderators')
  @default_permission(permission.CASTERS)
  async toggleModerators (opts: CommandOptions) {
    return this.toggle(opts, 'isModeratorAffected');
  }

  @command('!cooldown toggle owners')
  @default_permission(permission.CASTERS)
  async toggleOwners (opts: CommandOptions) {
    return this.toggle(opts, 'isOwnerAffected');
  }

  @command('!cooldown toggle subscribers')
  @default_permission(permission.CASTERS)
  async toggleSubscribers (opts: CommandOptions) {
    return this.toggle(opts, 'isSubscriberAffected');
  }

  @command('!cooldown toggle followers')
  @default_permission(permission.CASTERS)
  async toggleFollowers (opts: CommandOptions) {
    return this.toggle(opts, 'isFollowerAffected');
  }

  async toggleNotify (opts: CommandOptions) {
    return this.toggle(opts, 'isErrorMsgQuiet');
  }
  async toggleType (opts: CommandOptions) {
    return this.toggle(opts, 'type');
  }
}

export default new Cooldown();