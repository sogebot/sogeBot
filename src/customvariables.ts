import { setTimeout } from 'timers';

import { isNil } from 'lodash';
import { IsNull } from 'typeorm';
import { AppDataSource } from '~/database';

import Core from '~/_interface';
import {
  Variable, VariableHistory, VariableInterface, VariableURL, VariableWatch,
} from '~/database/entity/variable';
import { onStartup } from '~/decorators/on';
import { getBot } from '~/helpers/commons';
import { runScript, updateWidgetAndTitle } from '~/helpers/customvariables';
import { csEmitter } from '~/helpers/customvariables/emitter';
import { isDbConnected } from '~/helpers/database';
import { adminEndpoint } from '~/helpers/socket';

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
      const variables = await AppDataSource.getRepository(Variable).find({ relations: ['history', 'urls'] });
      cb(null, variables);
    });
    adminEndpoint('/core/customvariables', 'customvariables::runScript', async (id, cb) => {
      try {
        const item = await AppDataSource.getRepository(Variable).findOneBy({ id: String(id) });
        if (!item) {
          throw new Error('Variable not found');
        }
        const newCurrentValue = await runScript(item.evalValue, {
          sender: null, _current: item.currentValue, isUI: true,
        });
        const runAt = Date.now();
        cb(null, await AppDataSource.getRepository(Variable).save({
          ...item, currentValue: newCurrentValue, runAt,
        }));
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
      cb(null, (await AppDataSource.getRepository(Variable).find({ where: { variableName: String(variable) } })).filter(o => o.id !== id).length === 0);
    });
    adminEndpoint('/core/customvariables', 'customvariables::delete', async (id, cb) => {
      const item = await AppDataSource.getRepository(Variable).findOneBy({ id: String(id) });
      if (item) {
        await AppDataSource.getRepository(Variable).remove(item);
        await AppDataSource.getRepository(VariableWatch).delete({ variableId: String(id) });
        updateWidgetAndTitle();
      }
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint('/core/customvariables', 'customvariables::save', async (item, cb) => {
      try {
        const savedItem = await AppDataSource.getRepository(Variable).save(item);
        // somehow this is not populated by save on sqlite
        if (savedItem.urls) {
          for (const url of savedItem.urls) {
            await AppDataSource.getRepository(VariableURL).save({
              ...url,
              variable: savedItem,
            });
          }
        }
        // somehow this is not populated by save on sqlite
        if (savedItem.history) {
          for (const history of savedItem.history) {
            await AppDataSource.getRepository(VariableHistory).save({
              ...history,
              variable: savedItem,
            });
          }
        }
        await AppDataSource.getRepository(VariableHistory).delete({ variableId: IsNull() });
        await AppDataSource.getRepository(VariableURL).delete({ variableId: IsNull() });

        updateWidgetAndTitle(savedItem.variableName);
        csEmitter.emit('variable-changed', savedItem.variableName);
        cb(null, savedItem.id);
      } catch (e: any) {
        cb(e.stack, null);
      }
    });
  }

  async checkIfCacheOrRefresh () {
    if (!isDbConnected) {
      setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
      return;
    }

    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`]);
    const items = await AppDataSource.getRepository(Variable).find({ where: { type: 'eval' } });

    for (const item of items as Required<VariableInterface>[]) {
      try {
        item.runAt = isNil(item.runAt) ? 0 : item.runAt;
        const shouldRun = item.runEvery > 0 && Date.now() - new Date(item.runAt).getTime() >= item.runEvery;
        if (shouldRun) {
          const newValue = await runScript(item.evalValue, {
            _current: item.currentValue, sender: getBot(), isUI: false,
          });
          item.runAt = Date.now();
          item.currentValue = newValue;
          await AppDataSource.getRepository(Variable).save(item);
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
