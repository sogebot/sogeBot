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

  public sockets() {
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
}

export default new Plugins();
