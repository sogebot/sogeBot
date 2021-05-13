import _ from 'lodash';
import { getRepository } from 'typeorm';
import XRegExp from 'xregexp';

import { parserReply } from '../commons';
import * as constants from '../constants';
import {
  Cooldown as CooldownEntity, CooldownInterface, CooldownViewer, CooldownViewerInterface,
} from '../database/entity/cooldown';
import { Keyword } from '../database/entity/keyword';
import { User } from '../database/entity/user';
import {
  command, default_permission, parser, permission_settings, rollback, settings,
} from '../decorators';
import { onChange } from '../decorators/on';
import Expects from '../expects';
import { prepare } from '../helpers/commons';
import { debug, error } from '../helpers/log';
import { ParameterError } from '../helpers/parameterError';
import { getUserHighestPermission } from '../helpers/permissions/';
import { defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import { isOwner } from '../helpers/user';
import Parser from '../parser';
import { translate } from '../translate';
import System from './_interface';
import alias from './alias';
import customCommands from './customcommands';

const cache: { id: string; cooldowns: CooldownInterface[] }[] = [];
const defaultCooldowns: { name: string; lastRunAt: number, permId: string }[] = [];

/*
 * !cooldown [keyword|!command|g:group] [global|user] [seconds] [true/false] - set cooldown for keyword or !command, true/false set quiet mode
 * !cooldown unset [keyword|!command|g:group] - unset cooldown for keyword or !command, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command|g:group] [global|user]      - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command|g:group] [global|user]          - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle subscribers [keyword|!command|g:group] [global|user]     - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle followers [keyword|!command|g:group] [global|user]       - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command|g:group] [global|user]         - enable/disable specified keyword or !command cooldown
 */

class Cooldown extends System {
  @permission_settings('default', [ defaultPermissions.CASTERS ])
  defaultCooldownOfCommandsInSeconds = 0;
  @permission_settings('default', [ defaultPermissions.CASTERS ])
  defaultCooldownOfKeywordsInSeconds = 0;

  @settings()
  cooldownNotifyAsWhisper = false;

  @settings()
  cooldownNotifyAsChat = true;

  @onChange('defaultCooldownOfKeywordsInSeconds')
  resetDefaultCooldownsKeyword() {
    let idx: number;
    while ((idx = defaultCooldowns.findIndex(o => !o.name.startsWith('!'))) !== -1) {
      defaultCooldowns.splice(idx, 1);
    }
  }

  @onChange('defaultCooldownOfCommandsInSeconds')
  resetCooldownOfCommandsInSeconds(val: number) {
    let idx: number;
    while ((idx = defaultCooldowns.findIndex(o => o.name.startsWith('!'))) !== -1) {
      defaultCooldowns.splice(idx, 1);
    }
  }

  constructor () {
    super();
    this.addMenu({
      category: 'manage', name: 'cooldown', id: 'manage/cooldowns/list', this: this,
    });
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
        const cooldown = await getRepository(CooldownEntity).find({ order: { name: 'ASC' } });
        cb(null, cooldown);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      try {
        const cooldown = await getRepository(CooldownEntity).findOne({ where: { id } });
        cb(null, cooldown);
      } catch (e) {
        cb(e.stack);
      }
    });
  }

  async help (opts: CommandOptions): Promise<CommandResponse[]> {
    let url = 'http://sogehige.github.io/sogeBot/#/systems/cooldown';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogehige.github.io/sogeBot/#/_master/systems/cooldown';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!cooldown')
  @default_permission(defaultPermissions.CASTERS)
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [name, type, seconds, quiet] = new Expects(opts.parameters)
        .command({ canBeWithoutExclamationMark: true })
        .oneOf({ values: ['global', 'user'], name: 'type' })
        .number()
        .oneOf({ values: ['true'], optional: true })
        .toArray();

      const cooldown = await getRepository(CooldownEntity).findOne({
        where: {
          name,
          type,
        },
      });

      await getRepository(CooldownEntity).save({
        ...cooldown,
        name,
        miliseconds:          parseInt(seconds, 10) * 1000,
        type,
        timestamp:            0,
        isErrorMsgQuiet:      quiet !== null,
        isEnabled:            true,
        isOwnerAffected:      false,
        isModeratorAffected:  false,
        isSubscriberAffected: true,
        isFollowerAffected:   true,
      });
      return [{
        response: prepare('cooldowns.cooldown-was-set', {
          seconds, type, command: name,
        }), ...opts,
      }];
    } catch (e) {
      error(`${opts.command} ${opts.parameters} [${opts.sender.username}#${opts.sender.userId}]`);
      error(e.stack);
      if (e instanceof ParameterError) {
        return this.help(opts);
      } else {
        return [];
      }
    }
  }

  @command('!cooldown unset')
  @default_permission(defaultPermissions.CASTERS)
  async unset (opts: CommandOptions) {
    try {
      const [ commandOrKeyword ] = new Expects(opts.parameters).everything().toArray();
      await getRepository(CooldownEntity).delete({ name: commandOrKeyword });
      return [{ response: prepare('cooldowns.cooldown-was-unset', { command: commandOrKeyword }), ...opts }];
    } catch (e) {
      return this.help(opts);
    }
  }

  @parser({ priority: constants.HIGH, skippable: true })
  async check (opts: ParserOptions): Promise<boolean> {
    try {
      let data: (CooldownInterface | { type: 'default'; canBeRunAt: number; isEnabled: true; name: string; permId: string })[] = [];
      let viewer: CooldownViewerInterface | undefined;
      let timestamp, now;
      const [cmd, subcommand] = new Expects(opts.message)
        .command({ optional: true })
        .string({ optional: true })
        .toArray();

      if (!_.isNil(cmd)) { // command
        let name = subcommand ? `${cmd} ${subcommand}` : cmd;
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

        // get alias group
        let groupName = name;
        if (opts.message.startsWith('!')) {
          const [parsedAlias] = await alias.search(opts);
          if (parsedAlias && parsedAlias.group) {
            debug('cooldown.check', `Will be searching for group '${parsedAlias.group}' as well.`);
            groupName = `g:${parsedAlias.group}`;
          }
        }

        const cooldown = await getRepository(CooldownEntity).findOne({ where: [{ name }, { name: groupName }], relations: ['viewers'] });
        if (!cooldown) {
          const defaultValue = await this.getPermissionBasedSettingsValue('defaultCooldownOfCommandsInSeconds');
          const permId = await getUserHighestPermission(opts.sender.userId);

          // user group have some default cooldown
          if (defaultValue[permId] > 0) {
            const canBeRunAt = (defaultCooldowns.find(o =>
              o.permId === permId
              && o.name === cmd,
            )?.lastRunAt ?? 0) + defaultValue[permId] * 1000;
            data.push({
              isEnabled: true,
              name:      cmd,
              type:      'default',
              canBeRunAt,
              permId,
            });
          } else {
            // command is not on cooldown or default cooldown -> recheck with text only
            const replace = new RegExp(`${XRegExp.escape(name)}`, 'ig');
            const message = opts.message.replace(replace, '').trim();
            if (message.length > 0 && opts.message !== message) {
              debug('cooldown.check', `Command ${name} not on cooldown, checking: ${message}`);
              return this.check({ ...opts, message });
            } else {
              return true;
            }
          }
        } else {
          data = [cooldown];
        }
      } else { // text
        let [keywords, cooldowns] = await Promise.all([
          getRepository(Keyword).find(),
          getRepository(CooldownEntity).find({ relations: ['viewers'] }),
        ]);

        keywords = keywords.filter(o => {
          return opts.message.toLowerCase().search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword.toLowerCase()) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0;
        });

        data = [];
        for (const keyword of keywords) {
          const cooldown = cooldowns.find((o) => o.name.toLowerCase() === keyword.keyword.toLowerCase());
          if (keyword.enabled) {
            if (cooldown) {
              data.push(cooldown);
            } else {
              const defaultValue = await this.getPermissionBasedSettingsValue('defaultCooldownOfKeywordsInSeconds');
              const permId = await getUserHighestPermission(opts.sender.userId);
              // user group have some default cooldown
              if (defaultValue[permId] > 0) {
                const canBeRunAt = (defaultCooldowns.find(o =>
                  o.permId === permId
                  && o.name === keyword.keyword,
                )?.lastRunAt ?? 0) + defaultValue[permId] * 1000;
                data.push({
                  isEnabled: true,
                  name:      keyword.keyword,
                  type:      'default',
                  permId,
                  canBeRunAt,
                });
              }
            }
          }
        }
      }
      if (!_.some(data, { isEnabled: true })) { // parse ok if all cooldowns are disabled
        return true;
      }

      const user = await getRepository(User).findOne({ userId: opts.sender.userId });
      if (!user) {
        return true;
      }
      let result = false;

      const affectedCooldowns: CooldownInterface[] = [];
      for (const cooldown of data) {
        if (cooldown.type === 'default') {
          debug('cooldown.check', `Checking default cooldown ${cooldown.name} (${cooldown.permId}) ${cooldown.canBeRunAt}`);
          if (cooldown.canBeRunAt >= Date.now()) {
            debug('cooldown.check', `${opts.sender.username}#${opts.sender.userId} have ${cooldown.name} on global default cooldown, remaining ${Math.ceil((cooldown.canBeRunAt - Date.now()) / 1000)}s`);
            result = false;
          } else {
            const savedCooldown = defaultCooldowns.find(o =>
              o.permId === cooldown.permId
              && o.name === cooldown.name,
            );
            if (savedCooldown) {
              savedCooldown.lastRunAt = Date.now();
            } else {
              defaultCooldowns.push({
                lastRunAt: Date.now(),
                name:      cooldown.name,
                permId:    cooldown.permId,
              });
            }
            result = true;
          }
          continue;
        }
        if ((isOwner(opts.sender) && !cooldown.isOwnerAffected) || (user.isModerator && !cooldown.isModeratorAffected) || (user.isSubscriber && !cooldown.isSubscriberAffected) || (user.isFollower && !cooldown.isFollowerAffected)) {
          result = true;
          continue;
        }

        for (const item of cooldown.viewers?.filter(o => o.userId === opts.sender.userId) ?? []) {
          if (!viewer || viewer.timestamp < item.timestamp) {
            viewer = { ...item };
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
              cooldown, userId: opts.sender.userId, timestamp: now,
            });
          }
          affectedCooldowns.push({
            ...cooldown,
            timestamp: now,
          });
          result = true;
          continue;
        } else {
          if (!cooldown.isErrorMsgQuiet) {
            if (this.cooldownNotifyAsWhisper) {
              const response = prepare('cooldowns.cooldown-triggered', { command: opts.message, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
              parserReply(response, opts, 'whisper'); // we want to whisp cooldown message
            }
            if (this.cooldownNotifyAsChat) {
              const response = prepare('cooldowns.cooldown-triggered', { command: opts.message, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
              parserReply(response, opts, 'chat');
            }
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
            userId:    opts.sender.userId,
            ...cooldown.viewers.find(o => o.userId === opts.sender.userId),
          });
        }
        // rollback timestamp
        await getRepository(CooldownEntity).save(cooldown);
      }
    }
    cache.splice(cache.findIndex(o => o.id === opts.id), 1);
    return true;
  }

  async toggle (opts: CommandOptions, type: 'isEnabled' | 'isModeratorAffected' | 'isOwnerAffected' | 'isSubscriberAffected' | 'isFollowerAffected' | 'isErrorMsgQuiet' | 'type'): Promise<CommandResponse[]> {
    try {
      const [name, typeParameter] = new Expects(opts.parameters)
        .command({ canBeWithoutExclamationMark: true })
        .oneOf({ values: ['global', 'user'], name: 'type' })
        .toArray();

      const cooldown = await getRepository(CooldownEntity).findOne({
        relations: ['viewers'],
        where:     {
          name,
          type: typeParameter,
        },
      });
      if (!cooldown) {
        return [{ response: prepare('cooldowns.cooldown-not-found', { command: name }), ...opts }];
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
        return [];
      } // those two are setable only from dashboard

      return [{ response: prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.name }), ...opts }];
    } catch (e) {

      error(`${opts.command} ${opts.parameters} [${opts.sender.username}#${opts.sender.userId}]`);
      error(e.stack);
      if (e instanceof ParameterError) {
        return this.help(opts);
      } else {
        return [];
      }
    }
  }

  @command('!cooldown toggle enabled')
  @default_permission(defaultPermissions.CASTERS)
  async toggleEnabled (opts: CommandOptions) {
    return this.toggle(opts, 'isEnabled');
  }

  @command('!cooldown toggle moderators')
  @default_permission(defaultPermissions.CASTERS)
  async toggleModerators (opts: CommandOptions) {
    return this.toggle(opts, 'isModeratorAffected');
  }

  @command('!cooldown toggle owners')
  @default_permission(defaultPermissions.CASTERS)
  async toggleOwners (opts: CommandOptions) {
    return this.toggle(opts, 'isOwnerAffected');
  }

  @command('!cooldown toggle subscribers')
  @default_permission(defaultPermissions.CASTERS)
  async toggleSubscribers (opts: CommandOptions) {
    return this.toggle(opts, 'isSubscriberAffected');
  }

  @command('!cooldown toggle followers')
  @default_permission(defaultPermissions.CASTERS)
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