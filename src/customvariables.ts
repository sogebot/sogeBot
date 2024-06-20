import { setTimeout } from 'timers';

import { isNil } from 'lodash-es';
import { z } from 'zod';

import { Delete, Get, Post } from './decorators/endpoint.js';
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

class CustomVariables extends Core {
  timeouts: {
    [x: string]: NodeJS.Timeout;
  } = {};

  @onStartup()
  onStartup() {
    this.addMenu({
      scopeParent: this.scope(),
      category:    'registry',
      name:        'customvariables',
      id:          'registry/customvariables',
      this:        null,
    });
    this.checkIfCacheOrRefresh();
  }

  @Get('/')
  async getAll () {
    return await Variable.find();
  }

  @Post('/:id', {
    action: 'runScript',
  })
  async runScript (req: any) {
    const item = await Variable.findOneBy({ id: req.params.id });
    if (!item) {
      throw new Error('Variable not found');
    }
    const newCurrentValue = await runScript(item.evalValue, {
      sender: null, _current: item.currentValue, isUI: true,
    });
    item.runAt = new Date().toISOString();
    item.currentValue = newCurrentValue;
    return await item.save();
  }

  @Post('/', {
    action:       'testScript',
    zodValidator: z.object({
      evalValue:    z.string(),
      currentValue: z.any(),
    }),
  })
  testScript (req: any) {
    return runScript(req.body.evalValue, {
      isUI:     true, _current: req.body.currentValue, sender:   {
        userName: 'testuser', userId: '0', source: 'twitch',
      },
    });
  }

  @Delete('/:id')
  async delete (req: any) {
    const item = await Variable.findOneBy({ id: String(req.paams.id) });
    if (item) {
      await Variable.remove(item);
      await AppDataSource.getRepository(VariableWatch).delete({ variableId: String(req.paams.id) });
      await updateWidgetAndTitle();
    }
  }

  @Post('/')
  async save (req: any) {
    const itemToSave = await Variable.create(req.body).save();
    await updateWidgetAndTitle(itemToSave.variableName);
    eventEmitter.emit(Types.CustomVariableOnChange, itemToSave.variableName, itemToSave.currentValue, null);
    return itemToSave;
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
