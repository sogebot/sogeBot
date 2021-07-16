import { readdirSync, writeFileSync } from 'fs';

import { HOUR, MINUTE } from '@sogebot/ui-helpers/constants';
import gitCommitInfo from 'git-commit-info';
import {
  capitalize,
  get, isNil,
} from 'lodash';
import { getConnection, getRepository } from 'typeorm';

import Core from './_interface';
import { PermissionCommands } from './database/entity/permissions';
import {
  command, default_permission, settings, ui,
} from './decorators';
import {
  onChange, onLoad, onStartup,
} from './decorators/on';
import { isStreamOnline } from './helpers/api';
import { refreshCachedCommandPermissions } from './helpers/cache';
import { setLocale } from './helpers/dayjs';
import { setValue } from './helpers/general';
import { setLang } from './helpers/locales';
import {
  debug, error, warning,
} from './helpers/log';
import { getOAuthStatus } from './helpers/OAuthStatus';
import { socketsConnected } from './helpers/panel/';
import { addUIWarn } from './helpers/panel/';
import { defaultPermissions } from './helpers/permissions/';
import { list } from './helpers/register';
import { adminEndpoint } from './helpers/socket';
import { getMuteStatus } from './helpers/tmi/muteStatus';
import translateLib, { translate } from './translate';

let threadStartTimestamp = Date.now();
let isInitialLangSet = true;

const gracefulExit = () => {
  if (general.gracefulExitEachXHours > 0) {
    debug('thread', 'gracefulExit::check');
    if (Date.now() - threadStartTimestamp >= general.gracefulExitEachXHours * HOUR) {
      if (!isStreamOnline.value && socketsConnected === 0) {
        warning('Gracefully exiting sogeBot as planned and configured in UI in settings->general.');
        debug('thread', 'gracefulExit::exiting and creating restart file (so we dont have startup logging');
        writeFileSync('./restart.pid', ' ');
        process.exit(0);
      } else {
        debug('thread', 'gracefulExit::Gracefully exiting process skipped, stream online - moved by 15 minutes');
        // if stream is online move exit by hour
        threadStartTimestamp += 15 * MINUTE;
      }
    }
  } else {
    threadStartTimestamp = Date.now();
  }
};

class General extends Core {
  @ui({ type: 'helpbox' }, 'graceful_exit')
  shouldGracefulExitHelp = null;
  @settings('graceful_exit')
  gracefulExitEachXHours = 0;

  @settings('general')
  @ui({
    type:   'selector', values: () => {
      const f = readdirSync('./locales/');
      return [...new Set(f.map((o) => o.split('.')[0]))];
    },
  })
  public lang = 'en';

  @onStartup()
  onStartup() {
    this.addMenu({
      name: 'index', id: '', this: this,
    });
    this.addMenu({
      category: 'commands', name: 'botcommands', id: 'commands/botcommands', this: this,
    });
    this.addMenu({
      category: 'settings', name: 'modules', id: 'settings/modules', this: null,
    });
    this.addMenuPublic({ name: 'index', id: '' });
    setInterval(gracefulExit, 1000);
  }

  sockets() {
    type Command = {
      id: string,
      defaultValue: string,
      type: string,
      name: string,
      command: string,
      permission: string | null,
    };

    adminEndpoint(this.nsp, 'removeCache', (cb) => {
      const emotes = require('./emotes').default;
      emotes.removeCache();
      cb(null, null);
    });

    adminEndpoint(this.nsp, 'generic::getCoreCommands', async (cb: any) => {
      try {
        const commands: Command[] = [];

        for (const type of ['overlays', 'integrations', 'core', 'systems', 'games']) {
          for (const system of list(type)) {
            for (const cmd of system._commands) {
              const name = typeof cmd === 'string' ? cmd : cmd.name;
              commands.push({
                id:           cmd.id,
                defaultValue: name,
                command:      cmd.command ?? name,
                type:         capitalize(type),
                name:         system.__moduleName__,
                permission:   await new Promise((resolve: (value: string | null) => void) => {
                  getRepository(PermissionCommands).findOneOrFail({ name })
                    .then(data => {
                      resolve(data.permission);
                    })
                    .catch(() => {
                      resolve(cmd.permission ?? null);
                    });
                }),
              });
            }
          }
        }
        cb(null, commands);
      } catch (e) {
        cb(e, []);
      }
    });

    adminEndpoint(this.nsp, 'generic::setCoreCommand', async (commandToSet: Command, cb: any) => {
      // get module
      const module = list(commandToSet.type.toLowerCase()).find(item => item.__moduleName__ === commandToSet.name);
      if (!module) {
        throw new Error(`Module ${commandToSet.name} not found`);
      }

      const moduleCommand = module._commands.find((o) => o.name === commandToSet.defaultValue);
      if (!moduleCommand) {
        throw new Error(`Command ${commandToSet.defaultValue} not found in module ${commandToSet.name}`);
      }

      // handle permission
      if (commandToSet.permission === moduleCommand.permission) {
        await getRepository(PermissionCommands).delete({ name: moduleCommand.name });
      } else {
        await getRepository(PermissionCommands).save({
          ...(await getRepository(PermissionCommands).findOne({ name: moduleCommand.name })),
          name:       moduleCommand.name,
          permission: commandToSet.permission,
        });
      }

      // handle new command value
      module.setCommand(commandToSet.defaultValue, commandToSet.command);
      refreshCachedCommandPermissions();
      cb();
    });
  }

  @command('!enable')
  @default_permission(defaultPermissions.CASTERS)
  public async enable(opts: CommandOptions) {
    this.setStatus({ ...opts, enable: true });
  }

  @command('!disable')
  @default_permission(defaultPermissions.CASTERS)
  public async disable(opts: CommandOptions) {
    this.setStatus({ ...opts, enable: false });
  }

  @onChange('lang')
  @onLoad('lang')
  public async onLangUpdate() {
    if (!translateLib.isLoaded) {
      setTimeout(() => this.onLangUpdate(), 10);
      return;
    }
    if (!(await translateLib.check(this.lang))) {
      warning(`Language ${this.lang} not found - fallback to en`);
      this.lang = 'en';
    } else {
      setLocale(this.lang);
      setLang(this.lang);
      warning(translate('core.lang-selected'));
      if (!isInitialLangSet) {
        addUIWarn({ name: 'UI', message: translate('core.lang-selected') + '. ' + translate('core.refresh-panel') });
      }
      isInitialLangSet = false;
    }
  }

  public async onLangLoad() {
    await translateLib._load();
  }

  @command('!_debug')
  @default_permission(defaultPermissions.CASTERS)
  public async debug(opts: CommandOptions): Promise<CommandResponse[]> {
    const connection = await getConnection();

    const lang = this.lang;

    const enabledSystems: {
      systems: string[];
      games: string[];
      integrations: string[];
    } = {
      systems: [], games: [], integrations: [],
    };
    for (const category of ['systems', 'games', 'integrations']) {
      for (const system of list(category)) {
        const enabled = system.enabled;
        const areDependenciesEnabled = system.areDependenciesEnabled;
        const isDisabledByEnv = !isNil(process.env.DISABLE) && (process.env.DISABLE.toLowerCase().split(',').includes(system.__moduleName__.toLowerCase()) || process.env.DISABLE === '*');

        if (!enabled) {
          enabledSystems[category as 'systems' | 'games' | 'integrations'].push('-' + system.__moduleName__);
        } else if (!areDependenciesEnabled) {
          enabledSystems[category as 'systems' | 'games' | 'integrations'].push('-dep-' + system.__moduleName__);
        } else if (isDisabledByEnv) {
          enabledSystems[category as 'systems' | 'games' | 'integrations'].push('-env-' + system.__moduleName__);
        } else {
          enabledSystems[category as 'systems' | 'games' | 'integrations'].push(system.__moduleName__);
        }
      }
    }

    const version = get(process, 'env.npm_package_version', 'x.y.z');
    debug('*', '======= COPY DEBUG MESSAGE FROM HERE =======');
    debug('*', `GENERAL      | OS: ${process.env.npm_config_user_agent}`);
    debug('*', `             | Bot version: ${version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT')}`);
    debug('*', `             | DB: ${connection.options.type}`);
    debug('*', `             | HEAP: ${Number(process.memoryUsage().heapUsed / 1048576).toFixed(2)} MB`);
    debug('*', `             | Uptime: ${new Date(1000 * process.uptime()).toISOString().substr(11, 8)}`);
    debug('*', `             | Language: ${lang}`);
    debug('*', `             | Mute: ${getMuteStatus()}`);
    debug('*', `SYSTEMS      | ${enabledSystems.systems.join(', ')}`);
    debug('*', `GAMES        | ${enabledSystems.games.join(', ')}`);
    debug('*', `INTEGRATIONS | ${enabledSystems.integrations.join(', ')}`);
    debug('*', `OAUTH        | BOT ${getOAuthStatus('bot')} | BROADCASTER ${getOAuthStatus('broadcaster')}`);
    debug('*', '======= END OF DEBUG MESSAGE =======');
    return [];
  }

  @command('!ping')
  ping(opts: CommandOptions): CommandResponse[] {
    if (opts.sender.discord) {
      const response = `$sender, Pong! \`${Date.now() - opts.createdAt}ms\``;
      return [{ response, ...opts }];
    } else {
      const response = `$sender, Pong! ${Date.now() - opts.createdAt}ms`;
      return [{ response, ...opts }];
    }
  }

  @command('!set')
  @default_permission(defaultPermissions.CASTERS)
  public async setValue(opts: CommandOptions) {
    return setValue(opts);
  }

  private async setStatus(opts: CommandOptions & { enable: boolean }) {
    if (opts.parameters.trim().length === 0) {
      return;
    }
    try {
      const [type, name] = opts.parameters.split(' ');

      if (type !== 'system' && type !== 'game') {
        throw new Error('Not supported');
      }

      let found = false;
      for (const system of list(type + 's')) {
        system.status({ state: opts.enable });
        found = true;
        break;
      }

      if (!found) {
        throw new Error(`Not found - ${type}s - ${name}`);
      }
    } catch (e) {
      error(e.stack);
    }
  }
}

const general = new General();
export default general;