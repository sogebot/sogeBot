import {
  Variable, VariableWatch,
} from '@entity/variable.js';

import Widget from './_interface.js';

import { AppDataSource } from '~/database.js';
import { isVariableSetById, setValueOf } from '~/helpers/customvariables/index.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { adminEndpoint } from '~/helpers/socket.js';

class CustomVariables extends Widget {
  constructor() {
    super();
    eventEmitter.on('CustomVariable:OnRefresh', () => {
      this.emit('refresh');
    });
  }

  public sockets() {
    adminEndpoint('/widgets/customvariables', 'watched::save', async (items, cb) => {
      try {
        await AppDataSource.getRepository(VariableWatch).delete({});
        const variables = await AppDataSource.getRepository(VariableWatch).save(items);
        cb(null, variables);
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/widgets/customvariables', 'customvariables::list', async (cb) => {
      try {
        const variables = await AppDataSource.getRepository(Variable).find();
        cb(null, variables);
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/widgets/customvariables', 'list.watch', async (cb) => {
      try {
        const variables = await AppDataSource.getRepository(VariableWatch).find({ order: { order: 'ASC' } });
        cb(null, variables);
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/widgets/customvariables', 'watched::setValue', async (opts, cb) => {
      try {
        const variable = await isVariableSetById(opts.id);
        if (variable) {
          await setValueOf(variable.variableName, opts.value, { readOnlyBypass: true });
        }
        if (cb) {
          cb(null);
        }
      } catch (e: any) {
        if (cb) {
          cb(e.stack);
        }
      }
    });
  }
}

export default new CustomVariables();
