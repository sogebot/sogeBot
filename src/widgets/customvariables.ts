'use strict';

import {
  Variable, VariableWatch,
} from '@entity/variable';
import { AppDataSource } from '~/database';

import Widget from './_interface';

import { isVariableSetById, setValueOf } from '~/helpers/customvariables';
import { csEmitter } from '~/helpers/customvariables/emitter';
import { adminEndpoint } from '~/helpers/socket';

class CustomVariables extends Widget {
  constructor() {
    super();
    csEmitter.on('refresh', () => {
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
