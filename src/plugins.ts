import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants';
import { validateOrReject } from 'class-validator';
import * as cronparser from 'cron-parser';
import { cloneDeep } from 'lodash';
import merge from 'lodash/merge';

import type { Node } from '../d.ts/src/plugins';
import { Plugin, PluginVariable } from './database/entity/plugins';
import { isValidationError } from './helpers/errors';
import { eventEmitter } from './helpers/events';
import { error } from './helpers/log';
import { adminEndpoint } from './helpers/socket';
import { processes, processNode } from './plugins/index';

import Core from '~/_interface';
import { onStartup } from '~/decorators/on';

const cronTriggers = new Map<string, Node>();
const plugins: Plugin[] = [];

const generateListener = (parameters = {}, containSender = true) => {
  const values: Record<string, any> = {};
  if (containSender) {
    values.sender = {
      userName: 'string',
      userId:   'string',
    };
  }

  if (Object.keys(parameters).length > 0) {
    values.parameters = parameters;
  }

  return values;
};

const generateRegex = (parameters: { name: string; type: 'number' | 'word' | 'sentence' | 'custom'; regexp?: string; }[]) => {
  const matcher = {
    'number':   '[0-9]+',
    'word':     '[a-zA-Z]+',
    'sentence': '\'[a-zA-Z ]+\'',
  } as const;

  const regex = [];
  for (const param of parameters) {
    if (param.type === 'custom') {
      regex.push(`(?<${param.name}>${param.regexp})`);

    } else {
      regex.push(`(?<${param.name}>${matcher[param.type]})`);
    }
  }
  return `^${regex.join(' ')}$`;
};

const listeners = {
  tip: generateListener({
    isAnonymous: 'boolean',
    message:     'string',
    amount:      'number',
    currency:    'string',
    botAmount:   'number',
    botCurrency: 'string',
  }),
  twitchStreamStarted:    generateListener({}, false),
  twitchGameChanged:      generateListener({}, false),
  botStarted:             generateListener({}, false),
  twitchStreamStopped:    generateListener({}, false),
  twitchRaid:             generateListener({ hostViewers: 'number' }, true),
  twitchHosted:           generateListener({ hostViewers: 'number' }, true),
  twitchHosting:          generateListener({ hostViewers: 'number' }, true),
  twitchChatMessage:      generateListener({ message: 'string' }),
  twitchCommand:          generateListener({ message: 'string' }),
  twitchFollow:           generateListener(),
  twitchSubscription:     generateListener({ method: 'string', subCumulativeMonths: 'number', tier: 'tier' }),
  twitchSubgift:          generateListener({ recipient: 'string', tier: 'tier' }),
  twitchSubcommunitygift: generateListener({ count: 'number' }),
  twitchResub:            generateListener({ method: 'string', subCumulativeMonths: 'number', subStreak: 'number', subStreakShareEnabled: 'boolean', tier: 'string' }),
} as const;

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

    eventEmitter.on('tip', async (data) => {
      const users = (await import('./users')).default;
      const user = {
        userName: data.userName,
        userId:   !data.isAnonymous ? await users.getIdByName(data.userName) : '0',
      };
      this.process('tip', data.message, user, {
        isAnonymous: data.isAnonymous,
        amount:      data.amount + 120,
        botAmount:   data.amountInBotCurrency,
        currency:    data.currency,
        botCurrency: data.currencyInBot,
      });
    });

    eventEmitter.on('game-changed', async () => {
      this.process('twitchGameChanged');
    });

    eventEmitter.on('stream-started', async () => {
      this.process('twitchStreamStarted');
    });

    eventEmitter.on('stream-stopped', async () => {
      this.process('twitchStreamStopped');
    });

    const commonHandler = async <T extends { [x:string]: any, userName: string }>(event: keyof typeof listeners, data: T) => {
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

    eventEmitter.on('hosted', async (data) => {
      commonHandler('twitchHosted', data);
    });

    eventEmitter.on('hosting', async (data) => {
      this.process('twitchHosting', '', null, data);
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
    const cron = await this.process('cron', '', null, {});

    cronTriggers.clear();
    for (const { plugin, listeners: workflowListeners } of cron) {
      for (const node of workflowListeners) {
        try {
          const cronParsed = cronparser.parseExpression(node.data.value);

          const currentTime = Date.now();
          let lastTime = new Date().toISOString();
          const intervals: string[] = [];
          while (currentTime + (2 * MINUTE) > new Date(lastTime).getTime()) {
            lastTime = cronParsed.next().toISOString();
            intervals.push(lastTime);
          }

          for (const interval of intervals) {
            cronTriggers.set(`${plugin.id}|${interval}`, node);
          }
        } catch (e) {
          error(e);
        }
      }
    }
  }

  async triggerCrons() {
    for (const [pluginId, timestamp] of [...cronTriggers.keys()].map(o => o.split('|'))) {
      if (new Date(timestamp).getTime() < Date.now()) {
        const plugin = plugins.find(o => o.id === pluginId);
        const node = cronTriggers.get(`${pluginId}|${timestamp}`);
        if (plugin && node) {
          const workflow = Object.values(
            JSON.parse(plugin.workflow).drawflow.Home.data
          ) as Node[];
          this.processPath(pluginId, workflow, node, {}, {}, null);
        }
        cronTriggers.delete(`${pluginId}|${timestamp}`);
      }
    }
  }

  sockets() {
    adminEndpoint('/core/plugins', 'generic::getAll', async (cb) => {
      cb(null, plugins);
    });
    adminEndpoint('/core/plugins', 'generic::getOne', async (id, cb) => {
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
    adminEndpoint('/core/plugins', 'listeners', async (cb) => {
      cb(listeners);
    });
  }

  async processPath(pluginId: string, workflow: Node[], currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string } | null ) {
    parameters = cloneDeep(parameters);
    variables = cloneDeep(variables);

    // we need to check inputs first (currently just for load variable)
    if (currentNode.inputs.input_1) {
      const inputs = currentNode.inputs.input_1.connections.map((item) => workflow.find(wItem => wItem.id === Number(item.node)));
      for(const node of inputs) {
        if (!node) {
          continue;
        }
        switch(node.name) {
          case 'variableLoadFromDatabase': {
            const variableName = node.data.value;
            const defaultValue = (JSON.parse(node.data.data) as any).value;

            const variable = await PluginVariable.findOne({ variableName, pluginId });
            variables[variableName] = variable ? JSON.parse(variable.value) : defaultValue;
            break;
          }
        }
      }
    }

    const result = await processNode(currentNode.name as keyof typeof processes, pluginId, currentNode, parameters, variables, userstate);
    const output = result ? 'output_1' : 'output_2';

    if (currentNode.outputs[output]) {
      const nodes = currentNode.outputs[output].connections.map((item) => workflow.find(wItem => wItem.id === Number(item.node)));
      for (const node of nodes) {
        if (!node) {
          continue;
        }
        this.processPath(pluginId, workflow, node, parameters, variables, userstate);
      }
    }
  }

  async process(type: keyof typeof listeners | 'cron', message = '', userstate: { userName: string, userId: string } | null = null, params?: Record<string, any>) {
    const pluginsEnabled = plugins.filter(o => o.enabled);
    const pluginsWithListener: { plugin: Plugin, listeners: Node[] }[] = [];
    for (const plugin of pluginsEnabled) {
      // explore drawflow
      const workflow = Object.values(
        JSON.parse(plugin.workflow).drawflow.Home.data
      ) as Node[];

      const workflowListeners = workflow.filter((o: Node) => {
        params ??= {};
        const isListener = o.name === 'listener';
        const isWithoutFiltering
          = (o.name === 'cron' && type === 'cron')
          || (o.name === 'botStarted');
        const isType = o.data.value === type;

        params.message = message;

        if (isWithoutFiltering) {
          return true;
        }

        if (isListener && isType) {
          switch(type) {
            case 'twitchCommand': {
              const { command, parameters } = JSON.parse(o.data.data);

              const haveSubCommandOrParameters = message.replace(`!${command.replace('!', '')}`, '').split(' ').length > 1;
              const isStartingWithCommand = message.startsWith(`!${command.replace('!', '')}`);
              const doesParametersMatch = () => {
                try {
                  if (parameters.length === 0) {
                    if (haveSubCommandOrParameters) {
                      return false;
                    }
                    throw new Error(); // not expecting params
                  }
                  const messageWithoutCommandArray = message.split(' ');
                  messageWithoutCommandArray.shift();
                  const messageWithoutCommand = messageWithoutCommandArray.join(' ').trim();

                  const paramMatch = messageWithoutCommand.match(generateRegex(parameters as any));
                  if (paramMatch && paramMatch.groups) {
                    const groups: { [key: string]: string | number; } = paramMatch.groups;
                    for (const param of parameters) {
                      if (param.type === 'number') {
                        groups[param.name] = Number(groups[param.name]);
                      }
                    }
                    params = paramMatch.groups;
                    return true;
                  }
                  return false;
                } catch (e) {
                  return message === `!${command.replace('!', '')}`;
                }
              };

              if (isStartingWithCommand && doesParametersMatch()) {
                this.processPath(plugin.id, workflow, o, params, {}, userstate);
              }
              break;
            }
            default:
              this.processPath(plugin.id, workflow, o, params, {}, userstate);
              return true;
          }
        }
        return false;
      });

      if (workflowListeners.length > 0) {
        pluginsWithListener.push({ plugin, listeners: workflowListeners });
      }
    }
    return pluginsWithListener;
  }

  async trigger(type: 'tip', message: string, userstate: { userName: string, userId: string }, data: {
    currency: string, amount: number,
    botCurrency: string, botAmount: number,
  }): Promise<void>;
  async trigger(type: 'message', message: string, userstate: { userName: string, userId: string }): Promise<void>;
  async trigger(type: keyof typeof listeners, message: string, userstate: { userName: string, userId: string }): Promise<void>;

  async trigger(type: string, message: string, userstate: { userName: string, userId: string }, data?: Record<string, any>) {
    switch(type) {
      case 'message': {
        this.process(message.startsWith('!') ? 'twitchCommand' : 'twitchChatMessage', message, userstate);
        break;
      }
      case 'twitchFollow':
      case 'tip': {
        this.process(type, message, userstate, data);
        break;
      }
      default:
    }
  }
}

export default new Plugins();
