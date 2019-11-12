'use strict';

import Widget from './_interface';
import { adminEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { Variable, VariableWatch } from '../entity/variable';

class CustomVariables extends Widget {
  constructor() {
    super();
    this.addWidget('customvariables', 'widget-title-customvariables', 'fas fa-dollar-sign');

    require('cluster').on('message', (worker, message) => {
      if (message.type !== 'widget_custom_variables') {
        return;
      }
      this.emit(message.emit); // send update to widget
    });
  }

  public sockets() {
    adminEndpoint(this.nsp, 'list.variables', async (cb) => {
      const variables = await getRepository(Variable).find();
      cb(null, variables);
    });
    adminEndpoint(this.nsp, 'list.watch', async (cb) => {
      const variables = await getRepository(VariableWatch).find({
        order: {
          order: 'ASC',
        },
      });
      cb(null, variables);
    });
    adminEndpoint(this.nsp, 'set.value', async (opts, cb) => {
      const name = await global.customvariables.isVariableSetById(opts.id);
      if (name) {
        await global.customvariables.setValueOf(name, opts.value, { readOnlyBypass: true });
      }
      cb(null);
    });
  }
}

export default CustomVariables;
export { CustomVariables };
