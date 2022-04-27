import { Plugin } from './database/entity/plugins';
import { adminEndpoint } from './helpers/socket';

import Core from '~/_interface';
import { onStartup } from '~/decorators/on';

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

  async process(type: keyof typeof this.listeners, message: string, userstate: ChatUser) {
    const plugins = await Plugin.find();
    const pluginsWithListener: Plugin[] = [];
    for (const plugin of plugins) {
      // explore drawflow
      const workflow = Object.values(
        JSON.parse(plugin.workflow).drawflow.Home.data
      );

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
                console.log('Starting this listener', { o, params });
              }
              break;
            }
            default:
              console.log('Starting this listener', { o, params });
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
