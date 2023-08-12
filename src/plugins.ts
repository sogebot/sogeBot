/* eslint-disable @typescript-eslint/ban-ts-comment */
import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants';
import { validateOrReject } from 'class-validator';
import merge from 'lodash/merge';
import * as ts from 'typescript';

import { Plugin, PluginVariable } from './database/entity/plugins';
import { isValidationError } from './helpers/errors';
import { eventEmitter } from './helpers/events';
import { error, info } from './helpers/log';
import { adminEndpoint, publicEndpoint } from './helpers/socket';

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
      this.updateAllCrons();
    }, MINUTE);
    setInterval(() => {
      this.triggerCrons();
    }, SECOND);

    eventEmitter.on('clearchat', async () => {
      this.process('twitchClearChat');
    });

    eventEmitter.on('cheer', async (data) => {
      const user = {
        userName: data.userName,
        userId:   data.userId,
      };
      this.process('twitchCheer', data.message, user, {
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
      this.process('twitchGameChanged', undefined, undefined, { category: data.game, oldCategory: data.oldGame });
    });

    eventEmitter.on('stream-started', async () => {
      this.process('twitchStreamStarted');
    });

    eventEmitter.on('stream-stopped', async () => {
      this.process('twitchStreamStopped');
    });

    const commonHandler = async <T extends { [x:string]: any, userName: string }>(event: any, data: T) => {
      const users = (await import('./users')).default;
      const { userName, ...parameters } = data;
      const user = {
        userName,
        userId: await users.getIdByName(userName),
      };

      this.process(event, '', user, parameters);

    };

    eventEmitter.on('subscription', async (data) => {
      commonHandler('twitchSubscription', data);
    });

    eventEmitter.on('subgift', async (data) => {
      commonHandler('twitchSubgift', data);
    });

    eventEmitter.on('subcommunitygift', async (data) => {
      commonHandler('twitchSubcommunitygift', data);
    });

    eventEmitter.on('resub', async (data) => {
      commonHandler('twitchResub', data);
    });

    eventEmitter.on('reward-redeemed', async (data) => {
      commonHandler('twitchRewardRedeem', data);
    });

    eventEmitter.on('stream-stopped', async () => {
      this.process('twitchStreamStopped');
    });

    eventEmitter.on('stream-stopped', async () => {
      this.process('twitchStreamStopped');
    });

    eventEmitter.on('stream-stopped', async () => {
      this.process('twitchStreamStopped');
    });

    eventEmitter.on('follow', async (data) => {
      this.process('twitchFollow', '', data);
    });

    eventEmitter.on('raid', async (data) => {
      commonHandler('twitchRaid', data);
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
    await this.updateAllCrons();
  }

  async updateAllCrons() {
    // we will generate at least 2 minutes of span of crons
    // e.g. if we have cron every 1s -> 120 crons
    //                           10s -> 12  crons
    //                           10m -> 1   cron
    // const cron = await this.process('cron', '', null, {});

    // cronTriggers.clear();
    // for (const { plugin, listeners: workflowListeners } of cron) {
    //   for (const node of workflowListeners) {
    //     try {
    //       const cronParsed = cronparser.parseExpression(node.data.value);

    //       const currentTime = Date.now();
    //       let lastTime = new Date().toISOString();
    //       const intervals: string[] = [];
    //       while (currentTime + (2 * MINUTE) > new Date(lastTime).getTime()) {
    //         lastTime = cronParsed.next().toISOString();
    //         intervals.push(lastTime);
    //       }

    //       for (const interval of intervals) {
    //         cronTriggers.set(`${plugin.id}|${interval}`, node);
    //       }
    //     } catch (e) {
    //       error(e);
    //     }
    //   }
    // }
  }

  async triggerCrons() {
    // for (const [pluginId, timestamp] of [...cronTriggers.keys()].map(o => o.split('|'))) {
    //   if (new Date(timestamp).getTime() < Date.now()) {
    //     const plugin = plugins.find(o => o.id === pluginId);
    //     const node = cronTriggers.get(`${pluginId}|${timestamp}`);
    //     if (plugin && node) {
    //       const workflow = Object.values(
    //         JSON.parse(plugin.workflow).drawflow.Home.data
    //       ) as Node[];

    //       const settings: Record<string, any> = {};
    //       for (const item of (plugin.settings || [])) {
    //         settings[item.name] = item.currentValue;
    //       }
    //       this.processPath(pluginId, workflow, node, {}, { settings }, null);
    //     }
    //     cronTriggers.delete(`${pluginId}|${timestamp}`);
    //   }
    // }
  }

  sockets() {
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

  async process(type: any | 'cron', message = '', userstate: { userName: string, userId: string } | null = null, params?: Record<string, any>) {
    const pluginsEnabled = plugins.filter(o => o.enabled);
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
        // own scope
        // @ts-ignore
          const ListenTo = {
            Twitch: {
              command: (opts: { command: string }, callback: any) => {
                if (type === 'twitchCommand') {
                  console.log('command called');
                  callback({
                    userId:   '1',
                    userName: 'test',
                  }, []);
                }
              },
              message: (callback: any) => {
                if (type === 'twitchChatMessage') {
                  console.log('message called');
                  callback({
                    userId:   '1',
                    userName: 'test',
                  }, message);
                }
              },

            },
          };
          // @ts-ignore
          const Twitch = {
            sendMessage: () => {
              console.log('sendMessage called');
            },
          };
          // @ts-ignore
          const Permission = {
            accessTo: () => {
              console.log('accessTo called');
            },
          };
          // @ts-ignore
          const Log = {
            info: (msg: string) => {
              info(`PLUGINS#${plugin.id}:./${___code___.name}: ${msg}`);
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
    this.process(message.startsWith('!') ? 'twitchCommand' : 'twitchChatMessage', message, userstate);
  }
}

export default new Plugins();
