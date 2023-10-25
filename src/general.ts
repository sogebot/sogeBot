import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';

import { HOUR, MINUTE } from '@sogebot/ui-helpers/constants.js';
import { setLocale } from '@sogebot/ui-helpers/dayjsHelper.js';
import gitCommitInfo from 'git-commit-info';
import {
  capitalize,
  get, isNil,
} from 'lodash-es';

import { menu } from './helpers/panel.js';
import type { Command } from '../d.ts/src/general.js';

import Core from '~/_interface.js';
import { PermissionCommands } from '~/database/entity/permissions.js';
import {
  onChange, onLoad, onStartup,
} from '~/decorators/on.js';
import {
  command, default_permission, settings, ui,
} from '~/decorators.js';
import { isStreamOnline } from '~/helpers/api/index.js';
import { setValue } from '~/helpers/general/index.js';
import { setLang } from '~/helpers/locales.js';
import {
  debug, error, warning,
} from '~/helpers/log.js';
import { socketsConnected } from '~/helpers/panel/index.js';
import { addUIWarn } from '~/helpers/panel/index.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { list } from '~/helpers/register.js';
import { adminEndpoint } from '~/helpers/socket.js';
import { getMuteStatus } from '~/helpers/tmi/muteStatus.js';
import translateLib, { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

let threadStartTimestamp = Date.now();
let isInitialLangSet = true;

const gracefulExit = () => {
  if (general.gracefulExitEachXHours > 0) {
    debug('thread', 'gracefulExit::check');
    if (Date.now() - threadStartTimestamp >= general.gracefulExitEachXHours * HOUR) {
      if (!isStreamOnline.value && socketsConnected === 0) {
        warning('Gracefully exiting sogeBot as planned and configured in UI in settings->general.');
        debug('thread', 'gracefulExit::exiting and creating restart file (so we dont have startup logging');
        writeFileSync('~/restart.pid', ' ');
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
  @settings('graceful_exit')
    gracefulExitEachXHours = 0;

  @settings('general')
  @ui({
    type:   'selector', values: () => {
      const f = readdirSync('./locales/');
      return [...new Set(f.map((o) => o.split('.')[0]))];
    },
  })
    lang = 'en';

  @settings('general')
    numberFormat = '';

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
    adminEndpoint('/core/general', 'menu::private', async (cb) => {
      cb(menu.map((o) => ({
        category: o.category, name: o.name, id: o.id, enabled: o.this ? o.this.enabled : true,
      })));
    });

    adminEndpoint('/core/general', 'generic::getCoreCommands', async (cb) => {
      try {
        const commands: Command[] = [];

        for (const type of ['overlays', 'integrations', 'core', 'systems', 'games', 'services', 'registries']) {
          for (const system of list(type as any)) {
            for (const cmd of system._commands) {
              const name = typeof cmd === 'string' ? cmd : cmd.name;
              commands.push({
                id:           cmd.id,
                defaultValue: name,
                command:      cmd.command ?? name,
                type:         capitalize(type),
                name:         system.__moduleName__,
                permission:   await new Promise((resolve: (value: string | null) => void) => {
                  PermissionCommands.findOneByOrFail({ name })
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
      } catch (e: any) {
        cb(e, []);
      }
    });

    adminEndpoint('/core/general', 'generic::setCoreCommand', async (commandToSet, cb) => {
      // get module
      const module = list(commandToSet.type.toLowerCase() as any).find(item => item.__moduleName__ === commandToSet.name);
      if (!module) {
        throw new Error(`Module ${commandToSet.name} not found`);
      }

      const moduleCommand = module._commands.find((o) => o.name === commandToSet.defaultValue);
      if (!moduleCommand) {
        throw new Error(`Command ${commandToSet.defaultValue} not found in module ${commandToSet.name}`);
      }

      // handle permission
      if (commandToSet.permission === moduleCommand.permission) {
        await PermissionCommands.delete({ name: moduleCommand.name });
      } else {
        const entity = await PermissionCommands.findOneBy({ name: moduleCommand.name }) || new PermissionCommands();
        entity.name = moduleCommand.name;
        entity.permission = commandToSet.permission;
        await entity.save();
      }

      // handle new command value
      module.setCommand(commandToSet.defaultValue, commandToSet.command);
      cb(null);
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
    const lang = this.lang;

    const enabledSystems: {
      systems: string[];
      games: string[];
      integrations: string[];
    } = {
      systems: [], games: [], integrations: [],
    };
    for (const category of ['systems', 'games', 'integrations']) {
      for (const system of list(category as any)) {
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

    const botUsername = variables.get('services.twitch.botUsername') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
    const botId = variables.get('services.twitch.botId') as string;
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;

    const twitch = (await import('./services/twitch.js')).default;

    const version = get(process, 'env.npm_package_version', 'x.y.z');
    const commitFile = existsSync('./.commit') ? readFileSync('./.commit').toString() : null;
    debug('*', '======= COPY DEBUG MESSAGE FROM HERE =======');
    debug('*', `GENERAL      | OS: ${process.env.npm_config_user_agent}`);
    debug('*', `             | Bot version: ${version.replace('SNAPSHOT', commitFile && commitFile.length > 0 ? commitFile : gitCommitInfo().shortHash || 'SNAPSHOT')}`);
    debug('*', `             | DB: ${process.env.TYPEORM_CONNECTION}`);
    debug('*', `             | HEAP: ${Number(process.memoryUsage().heapUsed / 1048576).toFixed(2)} MB`);
    debug('*', `             | Uptime: ${new Date(1000 * process.uptime()).toISOString().substr(11, 8)}`);
    debug('*', `             | Language: ${lang}`);
    debug('*', `             | Mute: ${getMuteStatus()}`);
    debug('*', `SYSTEMS      | ${enabledSystems.systems.join(', ')}`);
    debug('*', `GAMES        | ${enabledSystems.games.join(', ')}`);
    debug('*', `INTEGRATIONS | ${enabledSystems.integrations.join(', ')}`);
    debug('*', `OAUTH        | BOT ${botUsername}#${botId} isConnected: ${twitch.tmi?.client.bot?.isConnected} | BROADCASTER ${broadcasterUsername}#${broadcasterId} isConnected: ${twitch.tmi?.client.broadcaster?.isConnected}`);
    debug('*', '======= END OF DEBUG MESSAGE =======');
    return [];
  }

  @command('!ping')
  ping(opts: CommandOptions): CommandResponse[] {
    if (opts.discord) {
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
      for (const system of list(type + 's' as any)) {
        system.status({ state: opts.enable });
        found = true;
        break;
      }

      if (!found) {
        throw new Error(`Not found - ${type}s - ${name}`);
      }
    } catch (e: any) {
      error(e.stack);
    }
  }
}

const general = new General();
export default general;