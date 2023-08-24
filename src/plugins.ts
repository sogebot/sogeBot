/* eslint-disable @typescript-eslint/ban-ts-comment */
import { SECOND } from '@sogebot/ui-helpers/constants';
import { validateOrReject } from 'class-validator';
import merge from 'lodash/merge';
import * as ts from 'typescript';

import { Plugin, PluginVariable } from './database/entity/plugins';
import { isValidationError } from './helpers/errors';
import { eventEmitter } from './helpers/events';
import { error } from './helpers/log';
import { app } from './helpers/panel';
import defaultPermissions from './helpers/permissions/defaultPermissions';
import { adminEndpoint, publicEndpoint } from './helpers/socket';
import { ListenToGenerator, Types } from './plugins/ListenTo';
import { LogGenerator } from './plugins/Log';
import { PermissionGenerator } from './plugins/Permission';
import { TwitchGenerator } from './plugins/Twitch';

import Core from '~/_interface';
import { onStartup } from '~/decorators/on';

const plugins: Plugin[] = [];

class Plugins extends Core {
  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'registry', name: 'plugins', id: 'registry/plugins', this: null,
    });

    this.updateCache().then(() => {
      this.process('botStarted');
    });
    setInterval(() => {
      this.triggerCrons();
    }, SECOND);

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
      const users = (await import('./users')).default;
      const user = {
        userName: data.userName,
        userId:   !data.isAnonymous ? await users.getIdByName(data.userName) : '0',
      };
      this.process('tip', data.message, user, {
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
      const users = (await import('./users')).default;
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
      commonHandler('twitchSubgift', data);
    });

    eventEmitter.on('subcommunitygift', async (data) => {
      commonHandler('twitchSubcommunitygift', data);
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

    publicEndpoint('/core/plugins', 'plugins::getSandbox', async ({ pluginId, nodeId }, cb) => {
      const plugin = plugins.find(o => o.id === pluginId);
      const sandbox: Record<string, any> = {
        variables: {},
        settings:  {},
      };
      if (plugin) {
        try {
          const workflow = JSON.parse(plugin.workflow).drawflow.Home.data;

          for (const setting of (plugin.settings || [])) {
            sandbox.settings[setting.name] = setting.currentValue;
          }

          for (const node of Object.values<any>(workflow)) {
            if (node.name === 'variableLoadFromDatabase') {
              const variableName = node.data.value;
              const defaultValue = (JSON.parse(node.data.data) as any).value;

              const variable = await PluginVariable.findOneBy({ variableName, pluginId });
              sandbox.variables[variableName] = variable ? JSON.parse(variable.value) : defaultValue;
            }
          }
        } catch(e) {
          error(e);
        }
      }
      cb(sandbox);
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
    const pluginsEnabled = plugins.filter(o => o.enabled);
    const _____socket______ = this.socket;
    for (const plugin of pluginsEnabled) {
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
        try {
          // @ts-ignore
          const ListenTo = ListenToGenerator(plugin.id, type, message, userstate, params);
          // @ts-ignore
          const Twitch = TwitchGenerator(plugin.id, userstate);
          // @ts-ignore
          const Permission = PermissionGenerator(plugin.id);
          // @ts-ignore
          const permission = defaultPermissions;
          // @ts-ignore
          const Log = LogGenerator(plugin.id, ___code___.name);
          // @ts-ignore
          const Overlay = {
            runFunction(functionName: string, args: any[], overlayId?: string) {
              _____socket______?.emit('trigger::function', functionName, args, overlayId);
            },
          };
          eval(ts.transpile(___code___.source));
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
