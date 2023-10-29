import {
  Cooldown as CooldownEntity,
} from '@entity/cooldown.js';
import { Keyword } from '@entity/keyword.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import { validateOrReject } from 'class-validator';
import _, { merge } from 'lodash-es';
import { In } from 'typeorm';

import System from './_interface.js';
import { parserReply } from '../commons.js';
import { onChange } from '../decorators/on.js';
import {
  command, default_permission, parser, permission_settings, rollback, settings,
} from '../decorators.js';
import { Expects } from  '../expects.js';
import { Parser } from '../parser.js';

import { AppDataSource } from '~/database.js';
import { prepare } from '~/helpers/commons/index.js';
import { debug, error, info } from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';
import { ParameterError } from '~/helpers/parameterError.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { getUserHighestPermission } from '~/helpers/permissions/getUserHighestPermission.js';
import * as changelog from '~/helpers/user/changelog.js';
import { isOwner } from '~/helpers/user/index.js';
import { adminMiddleware } from '~/socket.js';
import alias from '~/systems/alias.js';
import customCommands from '~/systems/customcommands.js';
import { translate } from '~/translate.js';

const cache: { id: string; cooldowns: CooldownEntity[] }[] = [];
const defaultCooldowns: { name: string; lastRunAt: number, permId: string }[] = [];
let viewers: {userId: string, timestamp: number, cooldownId: string}[] = [];

setInterval(async () => {
  for (const cooldown of await CooldownEntity.find()) {
    viewers = viewers.filter(o => (Date.now() + o.timestamp < cooldown.miliseconds && o.cooldownId === cooldown.id) || o.cooldownId !== cooldown.id);
  }
}, constants.HOUR);

/*
 * !cooldown set [keyword|!command|g:group] [global|user] [seconds] [true/false] - set cooldown for keyword or !command, true/false set quiet mode
 * !cooldown unset [keyword|!command|g:group] - unset cooldown for keyword or !command, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command|g:group] [global|user]      - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command|g:group] [global|user]          - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle subscribers [keyword|!command|g:group] [global|user]     - enable/disable specified keyword or !command cooldown for owners
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
  resetDefaultCooldownsKeyword() {
    let idx: number;
    while ((idx = defaultCooldowns.findIndex(o => !o.name.startsWith('!'))) !== -1) {
      defaultCooldowns.splice(idx, 1);
    }
  }

  @onChange('defaultCooldownOfCommandsInSeconds')
  resetCooldownOfCommandsInSeconds(val: number) {
    let idx: number;
    while ((idx = defaultCooldowns.findIndex(o => o.name.startsWith('!'))) !== -1) {
      defaultCooldowns.splice(idx, 1);
    }
  }

  constructor () {
    super();
    this.addMenu({
      category: 'commands', name: 'cooldowns', id: 'commands/cooldowns', this: this,
    });
  }

  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/cooldown', adminMiddleware, async (req, res) => {
      res.send({
        data: await CooldownEntity.find(),
      });
    });
    app.get('/api/systems/cooldown/:id', adminMiddleware, async (req, res) => {
      res.send({
        data: await CooldownEntity.findOneBy({ id: req.params.id }),
      });
    });
    app.delete('/api/systems/cooldown/:id', adminMiddleware, async (req, res) => {
      await CooldownEntity.delete({ id: req.params.id });
      res.status(404).send();
    });
    app.post('/api/systems/cooldown', adminMiddleware, async (req, res) => {
      try {
        const itemToSave = new CooldownEntity();
        merge(itemToSave, req.body);
        await validateOrReject(itemToSave);
        await itemToSave.save();
        res.send({ data: itemToSave });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
    });
  }

  async help (opts: CommandOptions): Promise<CommandResponse[]> {
    let url = 'http://sogebot.github.io/sogeBot/#/systems/cooldowns';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogebot.github.io/sogeBot/#/_master/systems/cooldowns';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @command('!cooldown set')
  @default_permission(defaultPermissions.CASTERS)
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      let [name, type, seconds, quiet] = new Expects(opts.parameters)
        .string({ additionalChars: ':!', withSpaces: true })
        .oneOf({ values: ['global', 'user'], name: 'type' })
        .number()
        .oneOf({ values: ['true'], optional: true })
        .toArray();

      if (name.includes('\'')) {
        name = name.replace(/'/g, '');
      }

      const cooldownToSave = new CooldownEntity();
      merge(cooldownToSave, {
        name,
        miliseconds:          parseInt(seconds, 10) * 1000,
        type,
        timestamp:            new Date(0).toISOString(),
        isErrorMsgQuiet:      quiet !== null,
        isEnabled:            true,
        isOwnerAffected:      false,
        isModeratorAffected:  false,
        isSubscriberAffected: true,
      }, await CooldownEntity.findOne({
        where: {
          name,
          type,
        },
      }));
      await cooldownToSave.save();

      return [{
        response: prepare('cooldowns.cooldown-was-set', {
          seconds, type, command: name,
        }), ...opts,
      }];
    } catch (e: any) {
      error(`${opts.command} ${opts.parameters} [${opts.sender.userName}#${opts.sender.userId}]`);
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
      await AppDataSource.getRepository(CooldownEntity).delete({ name: commandOrKeyword });
      return [{ response: prepare('cooldowns.cooldown-was-unset', { command: commandOrKeyword }), ...opts }];
    } catch (e: any) {
      return this.help(opts);
    }
  }

  @parser({ priority: constants.HIGH, skippable: true })
  async check (opts: ParserOptions): Promise<boolean> {
    try {
      if (!opts.sender) {
        return true;
      }
      let data: (CooldownEntity | { type: 'default'; canBeRunAt: number; isEnabled: true; name: string; permId: string })[] = [];
      let timestamp, now;
      const [cmd, subcommand] = new Expects(opts.message)
        .command({ optional: true })
        .string({ optional: true })
        .toArray();

      if (!_.isNil(cmd)) { // command
        let name = subcommand ? `${cmd} ${subcommand}` : cmd;
        let isFound = false;

        const parsed = await ((opts.parser || new Parser()).find(subcommand ? `${cmd} ${subcommand}` : cmd, null));
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
        const groupName = [];
        if (opts.message.startsWith('!')) {
          const [parsedAlias] = await alias.search(opts);
          if (parsedAlias && parsedAlias.group) {
            debug('cooldown.check', `Will be searching for group '${parsedAlias.group}' as well.`);
            groupName.push(`g:${parsedAlias.group}`);
          } else {
            const commands = await customCommands.find(opts.message);
            for (const item of commands) {
              if (item.command.group) {
                debug('cooldown.check', `Will be searching for group '${item.command.group}' as well.`);
                groupName.push(`g:${item.command.group}`);
              }
            }
          }
        }

        const cooldown = await AppDataSource.getRepository(CooldownEntity).findOne({ where: [{ name }, { name: In(groupName) }] });
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
            return true;
          }
        } else {
          data = [cooldown];
        }
      } else { // text
        let [keywords, cooldowns] = await Promise.all([
          AppDataSource.getRepository(Keyword).find(),
          AppDataSource.getRepository(CooldownEntity).find(),
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

      const user = await changelog.get(opts.sender.userId);
      if (!user) {
        return true;
      }
      let result = false;

      const affectedCooldowns: CooldownEntity[] = [];

      for (const cooldown of data) {
        debug('cooldown.check', `Checking cooldown entity: ${JSON.stringify(cooldown)}`);
        if (cooldown.type === 'default') {
          debug('cooldown.check', `Checking default cooldown ${cooldown.name} (${cooldown.permId}) ${cooldown.canBeRunAt}`);
          if (cooldown.canBeRunAt >= Date.now()) {
            debug('cooldown.check', `${opts.sender.userName}#${opts.sender.userId} have ${cooldown.name} on global default cooldown, remaining ${Math.ceil((cooldown.canBeRunAt - Date.now()) / 1000)}s`);
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
        debug('cooldown.check', `isOwner: ${isOwner(opts.sender)} isModerator: ${user.isModerator} isSubscriber: ${user.isSubscriber}`);
        debug('cooldown.check', `isOwnerAffected: ${cooldown.isOwnerAffected} isModeratorAffected: ${cooldown.isModeratorAffected} isSubscriberAffected: ${cooldown.isSubscriberAffected}`);

        if ((isOwner(opts.sender) && !cooldown.isOwnerAffected) || (user.isModerator && !cooldown.isModeratorAffected) || (user.isSubscriber && !cooldown.isSubscriberAffected)) {
          debug('cooldown.check', `User is not affected by this cooldown entity`);
          result = true;
          continue;
        }

        const viewer = viewers.find(o => o.cooldownId === cooldown.id && o.userId === opts.sender?.userId);
        debug('cooldown.db', viewer ?? `${opts.sender.userName}#${opts.sender.userId} not found in cooldown list`);
        if (cooldown.type === 'global') {
          timestamp = cooldown.timestamp ?? new Date(0).toISOString();
        } else {
          timestamp = new Date(viewer?.timestamp || 0).toISOString();
        }
        now = Date.now();

        if (now - new Date(timestamp).getTime() >= cooldown.miliseconds) {
          if (cooldown.type === 'global') {
            cooldown.timestamp = new Date().toISOString();
            await cooldown.save();
          } else {
            debug('cooldown.check', `${opts.sender.userName}#${opts.sender.userId} added to cooldown list.`);
            viewers = [...viewers.filter(o => !(o.cooldownId === cooldown.id && o.userId === opts.sender?.userId)), {
              timestamp:  Date.now(),
              cooldownId: cooldown.id,
              userId:     opts.sender.userId,
            }];
          }

          merge(cooldown, { timestamp: new Date().toISOString() });
          affectedCooldowns.push(cooldown);
          result = true;
          continue;
        } else {
          if (!cooldown.isErrorMsgQuiet) {
            if (this.cooldownNotifyAsWhisper) {
              const response = prepare('cooldowns.cooldown-triggered', { command: opts.message, seconds: Math.ceil((cooldown.miliseconds - now + new Date(timestamp).getTime()) / 1000) });
              parserReply(response, opts, 'whisper'); // we want to whisp cooldown message
            }
            if (this.cooldownNotifyAsChat) {
              const response = prepare('cooldowns.cooldown-triggered', { command: opts.message, seconds: Math.ceil((cooldown.miliseconds - now + new Date(timestamp).getTime()) / 1000) });
              parserReply(response, opts, 'chat');
            }
          }
          info(`${opts.sender.userName}#${opts.sender.userId} have ${cooldown.name} on cooldown, remaining ${Math.ceil((cooldown.miliseconds - now + new Date(timestamp).getTime()) / 1000)}s`);
          result = false;
          break; // disable _.each and updateQueue with false
        }
      }

      // cache cooldowns - keep only latest 50
      cache.push({ id: opts.id, cooldowns: affectedCooldowns });
      while(cache.length > 50) {
        cache.shift();
      }
      debug('cooldown.check', `User ${opts.sender.userName}#${opts.sender.userId} have ${result ? 'no' : 'some'} cooldowns`);
      return result;
    } catch (e: any) {
      error(`Something went wrong during cooldown check: ${e.stack}`);
      return false;
    }
  }

  @rollback()
  async cooldownRollback (opts: ParserOptions): Promise<boolean> {
    if (!opts.sender) {
      return true;
    }
    const cached = cache.find(o => o.id === opts.id);
    if (cached) {
      for (const cooldown of cached.cooldowns) {
        if (cooldown.type === 'global') {
          cooldown.timestamp = new Date(0).toISOString(); // we just revert to 0 as user were able to run it
        } else {
          viewers = viewers.filter(o => o.userId !== opts.sender?.userId && o.cooldownId !== cooldown.id);
        }
        // rollback timestamp
        await AppDataSource.getRepository(CooldownEntity).save(cooldown);
      }
    }
    cache.splice(cache.findIndex(o => o.id === opts.id), 1);
    return true;
  }

  async toggle (opts: CommandOptions, type: 'isEnabled' | 'isModeratorAffected' | 'isOwnerAffected' | 'isSubscriberAffected' | 'isErrorMsgQuiet' | 'type'): Promise<CommandResponse[]> {
    try {
      const [name, typeParameter] = new Expects(opts.parameters)
        .string({ additionalChars: ':!' })
        .oneOf({ values: ['global', 'user'], name: 'type' })
        .toArray();

      const cooldown = await AppDataSource.getRepository(CooldownEntity).findOne({
        where: {
          name,
          type: typeParameter,
        },
      });
      if (!cooldown) {
        return [{ response: prepare('cooldowns.cooldown-not-found', { command: name }), ...opts }];
      }

      if (type === 'type') {
        await AppDataSource.getRepository(CooldownEntity).save({
          ...cooldown,
          [type]: cooldown[type] === 'global' ? 'user' : 'global',
        });
      } else {
        await AppDataSource.getRepository(CooldownEntity).save({
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
      if (type === 'isErrorMsgQuiet' || type === 'type') {
        return [];
      } // those two are setable only from dashboard

      return [{ response: prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.name }), ...opts }];
    } catch (e: any) {

      error(`${opts.command} ${opts.parameters} [${opts.sender.userName}#${opts.sender.userId}]`);
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

  async toggleNotify (opts: CommandOptions) {
    return this.toggle(opts, 'isErrorMsgQuiet');
  }
  async toggleType (opts: CommandOptions) {
    return this.toggle(opts, 'type');
  }
}

export default new Cooldown();
