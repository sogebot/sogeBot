import { setTimeout } from 'timers';

import { isNil, merge } from 'lodash-es';

import { isValidationError } from './helpers/errors.js';
import { eventEmitter } from './helpers/events/index.js';
import getBotUserName from './helpers/user/getBotUserName.js';
import { Types } from './plugins/ListenTo.js';

import Core from '~/_interface.js';
import {
  Variable, VariableWatch,
} from '~/database/entity/variable.js';
import { AppDataSource } from '~/database.js';
import { onStartup } from '~/decorators/on.js';
import { runScript, updateWidgetAndTitle } from '~/helpers/customvariables/index.js';
import { isDbConnected } from '~/helpers/database.js';
import { adminEndpoint } from '~/helpers/socket.js';

class CustomVariables extends Core {
  timeouts: {
    [x: string]: NodeJS.Timeout;
  } = {};

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'registry', name: 'customvariables', id: 'registry/customvariables', this: null,
    });
    this.checkIfCacheOrRefresh();
  }

  sockets () {
    adminEndpoint('/core/customvariables', 'customvariables::list', async (cb) => {
      const variables = await Variable.find();
      cb(null, variables);
    });
    adminEndpoint('/core/customvariables', 'customvariables::runScript', async (id, cb) => {
      try {
        const item = await Variable.findOneBy({ id: String(id) });
        if (!item) {
          throw new Error('Variable not found');
        }
        const newCurrentValue = await runScript(item.evalValue, {
          sender: null, _current: item.currentValue, isUI: true,
        });
        item.runAt = new Date().toISOString();
        item.currentValue = newCurrentValue;

        cb(null, await item.save());
      } catch (e: any) {
        cb(e.stack, null);
      }
    });
    adminEndpoint('/core/customvariables', 'customvariables::testScript', async (opts, cb) => {
      let returnedValue;
      try {
        returnedValue = await runScript(opts.evalValue, {
          isUI:     true, _current: opts.currentValue, sender:   {
            userName: 'testuser', userId: '0', source: 'twitch',
          },
        });
      } catch (e: any) {
        cb(e.stack, null);
      }
      cb(null, returnedValue);
    });
    adminEndpoint('/core/customvariables', 'customvariables::isUnique', async ({ variable, id }, cb) => {
      cb(null, (await Variable.find({ where: { variableName: String(variable) } })).filter(o => o.id !== id).length === 0);
    });
    adminEndpoint('/core/customvariables', 'customvariables::delete', async (id, cb) => {
      const item = await Variable.findOneBy({ id: String(id) });
      if (item) {
        await Variable.remove(item);
        await AppDataSource.getRepository(VariableWatch).delete({ variableId: String(id) });
        updateWidgetAndTitle();
      }
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/core/customvariables', 'customvariables::save', async (item, cb) => {
      try {
        const itemToSave = new Variable();
        merge(itemToSave, item);
        await itemToSave.validateAndSave();
        updateWidgetAndTitle(itemToSave.variableName);
        eventEmitter.emit(Types.CustomVariableOnChange, itemToSave.variableName, itemToSave.currentValue, null);
        cb(null, itemToSave.id);
      } catch (e) {
        if (e instanceof Error) {
          cb(e.message, null);
        }
        if (isValidationError(e)) {
          cb(e, null);
        }
      }
    });
  }

  async checkIfCacheOrRefresh () {
    if (!isDbConnected) {
      setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
      return;
    }

    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`]);
    const items = await Variable.find({ where: { type: 'eval' } });

    for (const item of items) {
      try {
        item.runAt = isNil(item.runAt) ? new Date().toISOString() : item.runAt;
        const shouldRun = item.runEvery > 0 && Date.now() - new Date(item.runAt).getTime() >= item.runEvery;
        if (shouldRun) {
          const newValue = await runScript(item.evalValue, {
            _current: item.currentValue, sender: getBotUserName(), isUI: false,
          });
          item.runAt = new Date().toISOString();
          item.currentValue = newValue;
          await Variable.save(item);
          await updateWidgetAndTitle(item.variableName);
        }
      } catch (e: any) {
        continue;
      } // silence errors
    }
    this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`] = setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
  }
}

export default new CustomVariables();
