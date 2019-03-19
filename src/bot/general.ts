import * as config from '@config';
import { readdir } from 'fs';
import * as gitCommitInfo from 'git-commit-info';
import { get, isNil, map } from 'lodash';
import Core from './_interface';
import { permission } from './permissions';

class General extends Core {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        lang: 'en',
        commands: [
          { name: '!set', fnc: 'setValue', permission: permission.CASTERS },
          { name: '!_debug', fnc: 'debug', permission: permission.CASTERS },
          { name: '!enable', fnc: 'enable', permission: permission.CASTERS },
          { name: '!disable', fnc: 'disable', permission: permission.CASTERS },
        ],
      },
      ui: {
        lang: {
          type: 'selector',
          values: [],
        },
      },
      on: {
        change: {
          lang: ['onLangUpdate'],
        },
        load: {
          lang: ['onLangLoad'],
        },
      },
    };

    super(options);

    // update lang values
    readdir('./locales/', (err, f) => {
      this._ui.lang.values = [...new Set(f.map((o) => o.split('.')[0]))];
    });
  }

  public async enable(opts: CommandOptions) {
    this.setStatus({...opts, enable: true});
  }

  public async disable(opts: CommandOptions) {
    this.setStatus({...opts, enable: false});
  }

  private async onLangUpdate() {
    global.workers.sendToAll({ type: 'call', ns: 'lib.translate', fnc: '_load' });
    await global.lib.translate._load();
    global.log.warning(global.translate('core.lang-selected'));
  }

  private async onLangLoad() {
    await global.lib.translate._load();
  }

  private setValue(opts: CommandOptions) {
    // => alias of global.configuration.setValue
    global.configuration.setValue(opts);
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

  private async debug() {
    const widgets = await global.db.engine.find('widgets');

    const oauth = {
      broadcaster: global.oauth.settings.broadcaster.username !== '',
      bot: global.oauth.settings.bot.username !== '',
    };

    const lang = global.general.settings.configuration.lang;
    const mute = global.tmi.settings.chat.mute;

    const enabledSystems: any = {};
    for (const category of ['systems', 'games', 'integrations']) {
      if (isNil(enabledSystems[category])) { enabledSystems[category] = []; }
      for (const system of Object.keys(global[category]).filter((o) => !o.startsWith('_'))) {
        if (!global[category][system].settings) { continue; }
        const [enabled, areDependenciesEnabled, isDisabledByEnv] = await Promise.all([
          global[category][system].settings.enabled,
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
}

module.exports = General;
