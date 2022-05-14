import { validateOrReject } from 'class-validator';
import { cloneDeep } from 'lodash';
import merge from 'lodash/merge';

import type { Node } from '../d.ts/src/plugins';
import { Plugin, PluginVariable } from './database/entity/plugins';
import { isValidationError } from './helpers/errors';
import { adminEndpoint } from './helpers/socket';
import { processes, processNode } from './plugins/index';

import Core from '~/_interface';
import { onStartup } from '~/decorators/on';

const twitchChatMessage = {
  sender: {
    userName: 'string',
    userId:   'string',
  },
  message: 'string',
};
const twitchCommand = {
  sender: {
    userName: 'string',
    userId:   'string',
  },
  message: 'string',
};

const generateRegex = (parameters: { name: string; type: 'number' | 'word' | 'sentence'; }[]) => {
  const matcher = {
    'number':   '[0-9]+',
    'word':     '[a-zA-Z]+',
    'sentence': '\'[a-zA-Z ]+\'',
  } as const;

  const regex = [];
  for (const param of parameters) {
    regex.push(`(?<${param.name}>${matcher[param.type]})`);
  }
  return `^${regex.join(' ')}$`;
};

class Plugins extends Core {
  listeners = {
    twitchChatMessage,
    twitchCommand,
  } as const;

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'registry', name: 'plugins', id: 'registry/plugins', this: null,
    });
  }

  sockets() {
    adminEndpoint('/core/plugins', 'generic::getAll', async (cb) => {
      cb(null, await Plugin.find());
    });
    adminEndpoint('/core/plugins', 'generic::getOne', async (id, cb) => {
      cb(null, await Plugin.findOne(id));
    });
    adminEndpoint('/core/plugins', 'generic::deleteById', async (id, cb) => {
      await Plugin.delete({ id });
      await PluginVariable.delete({ pluginId: id });
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
      cb(this.listeners);
    });
  }

  async processPath(pluginId: string, workflow: Node[], currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: ChatUser ) {
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

  async process(type: keyof typeof this.listeners, message: string, userstate: ChatUser) {
    const plugins = await Plugin.find({ enabled: true });
    const pluginsWithListener: Plugin[] = [];
    for (const plugin of plugins) {
      // explore drawflow
      const workflow = Object.values(
        JSON.parse(plugin.workflow).drawflow.Home.data
      ) as Node[];

      const listeners = workflow.filter((o: any) => {
        let params: Record<string, any> = {};
        const isListener = o.name === 'listener';
        const isType = o.data.value === type;

        params.message = message;

        if (isListener && isType) {
          switch(type) {
            case 'twitchCommand': {
              const { command, parameters } = JSON.parse(o.data.data);

              const haveSubCommandOrParameters = message.split(' ').length > 1;

              const isStartingWithCommand = message.startsWith(`!${command}`);
              const doesParametersMatch = () => {
                try {
                  if (parameters.length === 0) {
                    throw new Error(); // not expecting params
                  }
                  const messageWithoutCommand = message.replace(`!${command}`, '').trim();
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
                  // not valid regex or not expecting params
                  if (haveSubCommandOrParameters && message !== `!${command}`) {
                    return false;
                  }
                  return true;
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

      if (listeners.length > 0) {
        pluginsWithListener.push(plugin);
      }
    }
    return pluginsWithListener;
  }

  async trigger(type: 'message', message: string, userstate: ChatUser) {
    switch(type) {
      case 'message': {
        this.process(message.startsWith('!') ? 'twitchCommand' : 'twitchChatMessage', message, userstate);
        break;
      }
      default:
    }
  }
}

export default new Plugins();
