import { readdirSync, writeFileSync } from 'fs';
import gitCommitInfo from 'git-commit-info';
import { get, isBoolean, isNil, isNumber, isString, map } from 'lodash';
import Core from './_interface';
import { command, default_permission, settings, ui } from './decorators';
import { onChange, onLoad } from './decorators/on';
import { permission } from './helpers/permissions';
import { isMainThread } from './cluster';
import { debug, error, warning } from './helpers/log';
import { getConnection, getRepository } from 'typeorm';
import { Widget } from './database/entity/dashboard';
import oauth from './oauth';
import translateLib, { translate } from './translate';
import tmi from './tmi';
import { HOUR, MINUTE } from './constants';
import api from './api';
import { socketsConnected } from './panel';
import { find, list } from './helpers/register';

let threadStartTimestamp = Date.now();
const gracefulExit = () => {
  if (general.gracefulExitEachXHours > 0) {
    debug('thread', 'gracefulExit::check');
    if (Date.now() - threadStartTimestamp >= general.gracefulExitEachXHours * HOUR) {
      if (!api.isStreamOnline && socketsConnected === 0) {
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
  @ui({
    type: 'helpbox',
  }, 'graceful_exit')
  shouldGracefulExitHelp = null;
  @settings('graceful_exit')
  gracefulExitEachXHours = 0;

  @settings('general')
  @ui({ type: 'selector', values: () => {
    const f = readdirSync('./locales/');
    return [...new Set(f.map((o) => o.split('.')[0]))];
  }})
  public lang = 'en';

  constructor() {
    super();
    setInterval(gracefulExit, 1000);

    this.addMenuPublic({ name: 'dashboard', id: '' });
  }

  @command('!enable')
  @default_permission(permission.CASTERS)
  public async enable(opts: CommandOptions) {
    this.setStatus({...opts, enable: true});
  }

  @command('!disable')
  @default_permission(permission.CASTERS)
  public async disable(opts: CommandOptions) {
    this.setStatus({...opts, enable: false});
  }

  @onChange('lang')
  @onLoad('lang')
  public async onLangUpdate() {
    await translateLib._load();
    if (isMainThread) {
      warning(translate('core.lang-selected'));
    }
  }

  public async onLangLoad() {
    await translateLib._load();
  }

  @command('!_debug')
  @default_permission(permission.CASTERS)
  public async debug() {
    const widgets = await getRepository(Widget).find();
    const connection = await getConnection();

    const oauthInfo = {
      broadcaster: oauth.broadcasterUsername !== '',
      bot: oauth.botUsername !== '',
    };

    const lang = this.lang;
    const mute = tmi.mute;

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
          enabledSystems[category].push('-' + system.__moduleName__);
        } else if (!areDependenciesEnabled) {
          enabledSystems[category].push('-dep-' + system.__moduleName__);
        } else if (isDisabledByEnv) {
          enabledSystems[category].push('-env-' + system.__moduleName__);
        } else {
          enabledSystems[category].push(system.__moduleName__);
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
    debug('*', `             | Mute: ${mute}`);
    debug('*', `SYSTEMS      | ${enabledSystems.systems.join(', ')}`);
    debug('*', `GAMES        | ${enabledSystems.games.join(', ')}`);
    debug('*', `INTEGRATIONS | ${enabledSystems.integrations.join(', ')}`);
    debug('*', `WIDGETS      | ${map(widgets, 'name').join(', ')}`);
    debug('*', `OAUTH        | BOT ${oauthInfo.bot} | BROADCASTER ${oauthInfo.broadcaster}`);
    debug('*', '======= END OF DEBUG MESSAGE =======');
  }

  @command('!set')
  @default_permission(permission.CASTERS)
  public async setValue(opts: CommandOptions) {
    // get value so we have a type
    const splitted = opts.parameters.split(' ');
    const pointer = splitted.shift();
    let newValue = splitted.join(' ');
    if (!pointer) {
      return [{ response: `$sender, settings does not exists`, ...opts }];
    }

    const [ type, module ] = pointer.split('.');
    const self = find(type, module);
    if (!self) {
      throw new Error(`${type}.${name} not found in list`);
    }

    const currentValue = self[pointer.split('.')[2]];
    if (typeof currentValue !== 'undefined') {
      if (isBoolean(currentValue)) {
        newValue = newValue.toLowerCase().trim();
        if (['true', 'false'].includes(newValue)) {
          self[pointer.split('.')[2]] = newValue === 'true';
          return [{ response: `$sender, ${pointer} set to ${newValue}`, ...opts }];
        } else {
          return [{ response: `$sender, !set error: bool is expected`, ...opts }];
        }
      } else if (isNumber(currentValue)) {
        if (isFinite(Number(newValue))) {
          self[pointer.split('.')[2]] = Number(newValue);
          return [{ response: `$sender, ${pointer} set to ${newValue}`, ...opts }];
        } else {
          return [{ response: `$sender, !set error: number is expected`, ...opts }];
        }
      } else if (isString(currentValue)) {
        self[pointer.split('.')[2]] = newValue;
        return [{ response: `$sender, ${pointer} set to '${newValue}'`, ...opts }];
      } else {
        return [{ response: `$sender, ${pointer} is not supported settings to change`, ...opts }];
      }
    } else {
      return [{ response: `$sender, ${pointer} settings not exists`, ...opts }];
    }
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
      error(e.message);
    }
  }
}

const general = new General();
export default general;