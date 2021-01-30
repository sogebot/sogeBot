'use strict';

import { getRepository } from 'typeorm';

import {
  Variable, VariableWatch, VariableWatchInterface,
} from '../database/entity/variable';
import { isVariableSetById, setValueOf } from '../helpers/customvariables';
import { csEmitter } from '../helpers/customvariables/emitter';
import { adminEndpoint } from '../helpers/socket';
import Widget from './_interface';

class CustomVariables extends Widget {
  constructor() {
    super();
    csEmitter.on('refresh', () => {
      this.emit('refresh');
    });
  }

  public sockets() {
    adminEndpoint(this.nsp, 'watched::save', async (items: VariableWatchInterface[], cb) => {
      try {
        await getRepository(VariableWatch).delete({});
        const variables = await getRepository(VariableWatch).save(items);
        cb(null, variables);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'customvariables::list', async (cb) => {
      try {
        const variables = await getRepository(Variable).find();
        cb(null, variables);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'list.watch', async (cb) => {
      try {
        const variables = await getRepository(VariableWatch).find({ order: { order: 'ASC' } });
        cb(null, variables);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'watched::setValue', async (opts, cb) => {
      try {
        const variable = await isVariableSetById(opts.id);
        if (variable) {
          await setValueOf(variable.variableName, opts.value, { readOnlyBypass: true });
        }
        if (cb) {
          cb(null);
        }
      } catch (e) {
        if (cb) {
          cb(e.stack);
        }
      }
    });
  }
}

export default new CustomVariables();
