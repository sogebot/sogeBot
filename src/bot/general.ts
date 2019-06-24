import config from '@config';
import { readdirSync } from 'fs';
import gitCommitInfo from 'git-commit-info';
import { get, isBoolean, isFinite, isNil, isNumber, isString, map, set } from 'lodash';
import Core from './_interface';
import { sendMessage } from './commons';
import { command, default_permission, settings, ui } from './decorators';
import { onChange, onLoad } from './decorators/on';
import { permission } from './permissions';
import { isMainThread } from 'worker_threads';

class General extends Core {
  @settings('general')
  @ui({ type: 'selector', values: () => {
    const f = readdirSync('./locales/');
    return [...new Set(f.map((o) => o.split('.')[0]))];
  }})
  public lang: string = 'en';

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
    global.workers.callOnAll({ type: 'call', ns: 'lib.translate', fnc: '_load' });
    await global.lib.translate._load();
    if (isMainThread) {
      global.log.warning(global.translate('core.lang-selected'));
    }
  }

  public async onLangLoad() {
    await global.lib.translate._load();
  }

  @command('!_debug')
  @default_permission(permission.CASTERS)
  public async debug() {
    const widgets = await global.db.engine.find('widgets');

    const oauth = {
      broadcaster: global.oauth.broadcasterUsername !== '',
      bot: global.oauth.botUsername !== '',
    };

    const lang = this.lang;
    const mute = global.tmi.mute;

    const enabledSystems: any = {};
    for (const category of ['systems', 'games', 'integrations']) {
      if (isNil(enabledSystems[category])) { enabledSystems[category] = []; }
      for (const system of Object.keys(global[category]).filter((o) => !o.startsWith('_'))) {
        if (!global[category][system].settings) { continue; }
        const [enabled, areDependenciesEnabled, isDisabledByEnv] = await Promise.all([
          global[category][system].enabled,
          global[category][system]._dependenciesEnabled(),
          !isNil(process.env.DISABLE) && (process.env.DISABLE.toLowerCase().split(',').includes(system.toLowerCase()) || process.env.DISABLE === '*'),
        ]);
        if (!enabled || !areDependenciesEnabled || isDisabledByEnv) { continue; }
        enabledSystems[category].push(system);
      }
    }
    const version = get(process, 'env.npm_package_version', 'x.y.z');
    global.log.debug('======= COPY DEBUG MESSAGE FROM HERE =======');
    global.log.debug(`GENERAL      | OS: ${process.env.npm_config_user_agent}`);
    global.log.debug(`             | Bot version: ${version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT')}`);
    global.log.debug(`             | DB: ${config.database.type}`);
    global.log.debug(`             | Threads: ${global.cpu}`);
    global.log.debug(`             | HEAP: ${Number(process.memoryUsage().heapUsed / 1048576).toFixed(2)} MB`);
    global.log.debug(`             | Uptime: ${process.uptime()} seconds`);
    global.log.debug(`             | Language: ${lang}`);
    global.log.debug(`             | Mute: ${mute}`);
    global.log.debug(`SYSTEMS      | ${enabledSystems.systems.join(', ')}`);
    global.log.debug(`GAMES        | ${enabledSystems.games.join(', ')}`);
    global.log.debug(`INTEGRATIONS | ${enabledSystems.integrations.join(', ')}`);
    global.log.debug(`WIDGETS      | ${map(widgets, 'id').join(', ')}`);
    global.log.debug(`OAUTH        | BOT ${oauth.bot} | BROADCASTER ${oauth.broadcaster}`);
    global.log.debug('======= END OF DEBUG MESSAGE =======');
  }

  @command('!set')
  @default_permission(permission.CASTERS)
  public async setValue(opts: CommandOptions) {
    // get value so we have a type
    const splitted = opts.parameters.split(' ');
    const pointer = splitted.shift();
    let newValue = splitted.join(' ');
    if (!pointer) {
      return sendMessage(`$sender, settings does not exists`, opts.sender, opts.attr);
    }
    const currentValue = await get(global, pointer, undefined);
    if (typeof currentValue !== 'undefined') {
      if (isBoolean(currentValue)) {
        newValue = newValue.toLowerCase().trim();
        if (['true', 'false'].includes(newValue)) {
          set(global, pointer, newValue === 'true');
          sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender, opts.attr);
        } else {
          sendMessage('$sender, !set error: bool is expected', opts.sender, opts.attr);
        }
      } else if (isNumber(currentValue)) {
        if (isFinite(Number(newValue))) {
          set(global, pointer, Number(newValue));
          sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender, opts.attr);
        } else {
          sendMessage('$sender, !set error: number is expected', opts.sender, opts.attr);
        }
      } else if (isString(currentValue)) {
        set(global, pointer, newValue);
        sendMessage(`$sender, ${pointer} set to '${newValue}'`, opts.sender, opts.attr);
      } else {
        sendMessage(`$sender, ${pointer} is not supported settings to change`, opts.sender, opts.attr);
      }
    } else {
      sendMessage(`$sender, ${pointer} settings not exists`, opts.sender, opts.attr);
    }
  }

  private async setStatus(opts: CommandOptions & { enable: boolean }) {
    if (opts.parameters.trim().length === 0) { return; }
    try {
      const [type, name] = opts.parameters.split(' ');

      if (type !== 'system' && type !== 'game') {
        throw new Error('Not supported');
      }

      if (isNil(global[type + 's'][name])) {
        throw new Error(`Not found - ${type}s - ${name}`);
      }

      global[type][name].status({ state: opts.enable });
    } catch (e) {
      global.log.error(e.message);
    }
  }
}

module.exports = General;
