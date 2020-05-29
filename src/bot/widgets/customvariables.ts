'use strict';

import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { Variable, VariableWatch, VariableWatchInterface } from '../database/entity/variable';
import customvariables from '../customvariables';

class CustomVariables extends Widget {
  constructor() {
    super();
    this.addWidget('customvariables', 'widget-title-customvariables', 'fas fa-dollar-sign');

    require('cluster').on('message', (_worker: Worker, message: { type: string, emit: string }) => {
      if (message.type !== 'widget_custom_variables') {
        return;
      }
      this.emit(message.emit); // send update to widget
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
        const variables = await getRepository(VariableWatch).find({
          order: {
            order: 'ASC',
          },
        });
        cb(null, variables);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'watched::setValue', async (opts, cb) => {
      try {
        const variable = await customvariables.isVariableSetById(opts.id);
        if (variable) {
          await customvariables.setValueOf(variable.variableName, opts.value, {
            readOnlyBypass: true,
          });
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
