import { setTimeout } from 'timers/promises';

import { cloneDeep } from 'lodash';
import { VM } from 'vm2';

import { Plugin, PluginVariable } from './database/entity/plugins';
import { flatten } from './helpers/flatten';
import { info, warning } from './helpers/log';
import { adminEndpoint } from './helpers/socket';

import Core from '~/_interface';
import { onStartup } from '~/decorators/on';

type Node = {
  id: number,
  name: string,
  data: { value: string, data: string },
  class: string,
  html: string,
  inputs: { input_1: { connections: {
    node: string,
  }[] }} | Record<string, never>,
  outputs: { output_1: { connections: {
    node: string,
  }[] }},
};

const twitchChatMessage = {
  sender: {
    username: 'String',
    userId:   'String',
  },
  message: 'String',
};
const twitchCommand = {
  sender: {
    username: 'String',
    userId:   'String',
  },
  message: 'String',
};

const generateRegex = (parameters: { name: string; type: 'number' | 'word' | 'sentence'; }[]) => {
  const matcher = {
    'number':   '[0-9]+',
    'word':     '[a-Z]+',
    'sentence': '\'[a-Z ]+\'',
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
      cb(null);
    });
    adminEndpoint('/core/plugins', 'generic::save', async (item, cb) => {
      try {
        const itemToSave = new Plugin();
        if (!item.id) {
          throw new Error('ID cannot be undefined');
        }
        itemToSave.id = item.id;
        if (!item.name) {
          throw new Error('Name cannot be undefined');
        }
        itemToSave.name = item.name;
        if (!item.workflow) {
          throw new Error('Workflow cannot be undefined');
        }
        itemToSave.workflow = item.workflow;
        await itemToSave.save();
        cb(null, itemToSave);
      } catch (e) {
        if (e instanceof Error) {
          cb(e, undefined);
        }
      }
    });
    adminEndpoint('/core/plugins', 'listeners', async (cb) => {
      cb(this.listeners);
    });
  }

  template(message: string, params: Record<string, any>) {
    params = flatten(params);
    const regexp = new RegExp(`{ *?(?<variable>[a-zA-Z0-9.]+) *?}`, 'g');
    const match = message.matchAll(regexp);
    for (const item of match) {
      message = message.replace(item[0], params[item[1]]);
    }
    return message;
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

    // process node
    switch(currentNode.name) {
      case 'listener': {
        // do nothing with listener and continue
        break;
      }
      case 'variableSetVariable': {
        const variableName = currentNode.data.value;
        const toEval = JSON.parse(currentNode.data.data).value.trim();

        const vm = new VM({
          sandbox: {
            parameters, ...variables,
          },
        });
        const value = await vm.run(`(function () { return ${toEval} })`)();

        variables[variableName] = value;
        break;
      }
      case 'variableSaveToDatabase': {
        const variableName = currentNode.data.value;
        const variable = new PluginVariable();
        variable.variableName = variableName;
        variable.pluginId = pluginId;
        variable.value = JSON.stringify(variables[variableName]);
        await variable.save();
        break;
      }
      case 'othersIdle': {
        let miliseconds = await this.template(currentNode.data.value, { parameters, ...variables });
        if (isNaN(Number(miliseconds))) {
          warning(`PLUGINS#${pluginId}: Idling value is not a number! Got: ${miliseconds}, defaulting to 1000`);
          miliseconds = '1000';
        }
        await setTimeout(Number(miliseconds));
        break;
      }
      case 'outputLog': {
        info(`PLUGINS#${pluginId}: ${await this.template(currentNode.data.value, { parameters, ...variables })}`);
        break;
      }
      default:
        warning(`PLUGINS: no idea what should I do with ${currentNode.name}, stopping`);
        console.log({ currentNode, parameters, variables });
        return;
    }

    const nodes = currentNode.outputs.output_1.connections.map((item) => workflow.find(wItem => wItem.id === Number(item.node)));
    for (const node of nodes) {
      if (!node) {
        continue;
      }
      this.processPath(pluginId, workflow, node, parameters, variables, userstate);
    }
  }

  async process(type: keyof typeof this.listeners, message: string, userstate: ChatUser) {
    const plugins = await Plugin.find();
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

        if (isListener && isType) {
          switch(type) {
            case 'twitchCommand': {
              const { command, parameters } = JSON.parse(o.data.data);

              const isExactCommand = message.startsWith(`!${command}`);
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
                } catch {
                  // not valid regex or not expecting params
                  return true;
                }
              };

              if (isExactCommand && doesParametersMatch()) {
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
