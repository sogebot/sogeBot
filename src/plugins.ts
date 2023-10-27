import { SECOND } from '@sogebot/ui-helpers/constants.js';
import { validateOrReject } from 'class-validator';
import { merge } from 'lodash-es';

import { Plugin, PluginVariable } from './database/entity/plugins.js';
import { isValidationError } from './helpers/errors.js';
import { eventEmitter } from './helpers/events/index.js';
import { debug, error } from './helpers/log.js';
import { app } from './helpers/panel.js';
import { setImmediateAwait } from './helpers/setImmediateAwait.js';
import { adminEndpoint, publicEndpoint } from './helpers/socket.js';
import { Types } from './plugins/ListenTo.js';
import { runScriptInSandbox, transpiledFiles } from './plugins/Sandbox.js';

import Core from '~/_interface.js';
import { onStartup } from '~/decorators/on.js';

const plugins: Plugin[] = [];

class Plugins extends Core {
  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'registry', name: 'plugins', id: 'registry/plugins', this: null,
    });

    this.updateCache().then(() => {
      this.process(Types.Started);
    });
    setInterval(() => {
      this.triggerCrons();
    }, SECOND);

    eventEmitter.on(Types.onChannelCharityCampaignStart, async (args) => {
      this.process(Types.onChannelCharityCampaignStart, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelCharityCampaignProgress, async (args) => {
      this.process(Types.onChannelCharityCampaignProgress, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelCharityCampaignStop, async (args) => {
      this.process(Types.onChannelCharityCampaignStop, undefined, undefined, { args });
    });

    eventEmitter.on(Types.onChannelCharityDonation, async (args) => {
      this.process(Types.onChannelCharityDonation, undefined, undefined, { args });
    });

    eventEmitter.on(Types.onChannelGoalBegin, async (args) => {
      this.process(Types.onChannelGoalBegin, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelGoalProgress, async (args) => {
      this.process(Types.onChannelGoalProgress, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelGoalEnd, async (args) => {
      this.process(Types.onChannelGoalEnd, undefined, undefined, { args });
    });

    eventEmitter.on(Types.onChannelModeratorAdd, async (args) => {
      this.process(Types.onChannelModeratorAdd, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelModeratorRemove, async (args) => {
      this.process(Types.onChannelModeratorRemove, undefined, undefined, { args });
    });

    eventEmitter.on(Types.onChannelRewardAdd, async (args) => {
      this.process(Types.onChannelRewardAdd, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelRewardUpdate, async (args) => {
      this.process(Types.onChannelRewardUpdate, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelRewardRemove, async (args) => {
      this.process(Types.onChannelRewardRemove, undefined, undefined, { args });
    });

    eventEmitter.on(Types.onChannelShieldModeBegin, async (args) => {
      this.process(Types.onChannelShieldModeBegin, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelShieldModeEnd, async (args) => {
      this.process(Types.onChannelShieldModeEnd, undefined, undefined, { args });
    });

    eventEmitter.on(Types.onChannelShoutoutCreate, async (args) => {
      this.process(Types.onChannelShoutoutCreate, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelShoutoutReceive, async (args) => {
      this.process(Types.onChannelShoutoutReceive, undefined, undefined, { args });
    });

    eventEmitter.on(Types.onChannelUpdate, async (args) => {
      this.process(Types.onChannelUpdate, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onUserUpdate, async (args) => {
      this.process(Types.onUserUpdate, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelRaidFrom, async (args) => {
      this.process(Types.onChannelRaidFrom, undefined, undefined, { args });
    });
    eventEmitter.on(Types.onChannelRedemptionUpdate, async (args) => {
      this.process(Types.onChannelRedemptionUpdate, undefined, undefined, { args });
    });

    eventEmitter.on(Types.CustomVariableOnChange, async (variableName, cur, prev) => {
      this.process(Types.CustomVariableOnChange, undefined, undefined, { variableName, cur, prev });
    });

    eventEmitter.on('clearchat', async () => {
      this.process(Types.TwitchClearChat);
    });

    eventEmitter.on('cheer', async (data) => {
      const user = {
        userName: data.userName,
        userId:   data.userId,
      };
      this.process(Types.TwitchCheer, data.message, user, {
        amount: data.bits,
      });
    });

    eventEmitter.on('tip', async (data) => {
      const users = (await import('./users.js')).default;
      const user = {
        userName: data.userName,
        userId:   !data.isAnonymous ? await users.getIdByName(data.userName) : '0',
      };
      this.process(Types.GenericTip, data.message, user, {
        isAnonymous: data.isAnonymous,
        amount:      data.amount,
        botAmount:   data.amountInBotCurrency,
        currency:    data.currency,
        botCurrency: data.currencyInBot,
      });
    });

    eventEmitter.on('game-changed', async (data) => {
      this.process(Types.TwitchGameChanged, undefined, undefined, { category: data.game, oldCategory: data.oldGame });
    });

    eventEmitter.on('stream-started', async () => {
      this.process(Types.TwitchStreamStarted);
    });

    eventEmitter.on('stream-stopped', async () => {
      this.process(Types.TwitchStreamStopped);
    });

    const commonHandler = async <T extends { [x:string]: any, userName: string }>(event: Types, data: T) => {
      const users = (await import('./users.js')).default;
      const { userName, ...parameters } = data;
      const user = {
        userName,
        userId: await users.getIdByName(userName),
      };

      this.process(event, '', user, parameters);
    };

    eventEmitter.on('subscription', async (data) => {
      commonHandler(Types.TwitchSubscription, data);
    });

    eventEmitter.on('subgift', async (data) => {
      commonHandler(Types.TwitchSubgift, data);
    });

    eventEmitter.on('subcommunitygift', async (data) => {
      commonHandler(Types.TwitchSubcommunitygift, data);
    });

    eventEmitter.on('resub', async (data) => {
      commonHandler(Types.TwitchResub, data);
    });

    eventEmitter.on('reward-redeemed', async (data) => {
      commonHandler(Types.TwitchRewardRedeem, data);
    });

    eventEmitter.on('follow', async (data) => {
      this.process(Types.TwitchFollow, '', data);
    });

    eventEmitter.on('raid', async (data) => {
      commonHandler(Types.TwitchRaid, data);
    });
  }

  async updateCache () {
    const _plugins = await Plugin.find();
    while (plugins.length > 0) {
      plugins.shift();
    }
    for (const plugin of _plugins) {
      plugins.push(plugin);
    }
  }

  async triggerCrons() {
    for (const plugin of plugins) {
      if (!plugin.enabled) {
        continue;
      }
      try {
        const workflow = JSON.parse(plugin.workflow);
        if (!Array.isArray(workflow.code)) {
          continue;
        }

        for (const file of workflow.code) {
          if (!file.source.includes('ListenTo.Cron')) {
            continue;
          }

          this.process(Types.Cron);
          break; // we found at least one cron to run
        }
      } catch {
        continue;
      }
    }
  }

  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }
    app.get('/overlays/plugin/:pid/:id', async (req, res) => {
      try {
        const plugin = plugins.find(o => o.id === req.params.pid);
        if (!plugin) {
          return res.status(404).send();
        }

        const files = JSON.parse(plugin.workflow);
        const overlay = files.overlay.find((o: any) => o.id === req.params.id);
        if (!overlay) {
          return res.status(404).send();
        }

        const source = overlay.source.replace('</body>', `
        <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"crossorigin="anonymous"></script>
        <script type="text/javascript">
          window.socket = io('/core/plugins', {
            transports: [ 'websocket' ],
          });
          window.socket.on("connect_error", () => {
            console.log('Socket connect_error', window.socket.id); // undefined

          })
          window.socket.on("connect", () => {
            console.log('Socket connected', window.socket.id); // x8WIv7-mJelg7on_ALbx
            window.socket.on("disconnect", () => {
              console.log('Socket disconnected', window.socket.id); // undefined
            });
            window.socket.on('trigger::function', (functionName, args, overlayId) => {
              if (overlayId && overlayId !== location.pathname.split('/')[location.pathname.split('/').length - 1]) {
                // do nothing if overlay ID is defined and doesn't match
                return;
              }
              console.groupCollapsed('trigger::function');
              console.log({functionName, args});
              console.groupEnd();
              window[functionName](...args)
            })
          });
        </script>
        </body>
        `);
        res.send(source);
      } catch (e) {
        error(e);
        return res.status(500).send();
      }
    });
    adminEndpoint('/core/plugins', 'generic::getAll', async (cb) => {
      cb(null, plugins);
    });
    publicEndpoint('/core/plugins', 'generic::getOne', async (id, cb) => {
      cb(null, plugins.find(o => o.id === id));
    });
    adminEndpoint('/core/plugins', 'generic::deleteById', async (id, cb) => {
      await Plugin.delete({ id });
      await PluginVariable.delete({ pluginId: id });
      await this.updateCache();
      transpiledFiles.clear();
      cb(null);
    });
    adminEndpoint('/core/plugins', 'generic::validate', async (data, cb) => {
      try {
        const item = new Plugin();
        merge(item, data);
        await validateOrReject(item);
        cb(null);
      } catch (e) {
        if (e instanceof Error) {
          cb(e.message);
        }
        if (isValidationError(e)) {
          cb(e);
        }
      }
    });
    adminEndpoint('/core/plugins', 'generic::save', async (item, cb) => {
      try {
        const itemToSave = new Plugin();
        merge(itemToSave, item);
        await validateOrReject(itemToSave);
        await itemToSave.save();
        await this.updateCache();
        transpiledFiles.clear();
        cb(null, itemToSave);
      } catch (e) {
        if (e instanceof Error) {
          cb(e.message, undefined);
        }
        if (isValidationError(e)) {
          cb(e, undefined);
        }
      }
    });
  }

  async process(type: Types, message = '', userstate: { userName: string, userId: string } | null = null, params?: Record<string, any>) {
    debug('plugins', `Processing plugin: ${JSON.stringify({ type, message, userstate, params })}`);
    const pluginsEnabled = plugins.filter(o => o.enabled);
    for (const plugin of pluginsEnabled) {
      await setImmediateAwait();
      // explore drawflow
      const __________workflow__________: {
        code: { name: string, source: string, id: string}[],
        overflow: { name: string, source: string, id: string}[]
      } = (
        JSON.parse(plugin.workflow)
      );
      if (!Array.isArray(__________workflow__________.code)) {
        continue; // skip legacy plugins
      }

      for (const ___code___ of  __________workflow__________.code) {
        await setImmediateAwait();
        try {
          runScriptInSandbox(plugin, userstate, message, type, ___code___, params, {
            socket: this.socket,
          });
        } catch (e) {
          error(`PLUGINS#${plugin.id}:./${___code___.name}: ${e}`);
        }
      }
    }
  }

  /* TODO: replace with event emitter */
  async trigger(type: 'message', message: string, userstate: { userName: string, userId: string }): Promise<void> {
    this.process(message.startsWith('!') ? Types.TwitchCommand : Types.TwitchMessage, message, userstate);
  }
}

export default new Plugins();
