'use strict';

import _ from 'lodash';
import Widget from './_interface';

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
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
    this.socket.on('connection', (socket) => {
      socket.on('list.variables', async (cb) => {
        const variables = await global.db.engine.find('custom.variables');
        cb(null, variables);
      });
      socket.on('list.watch', async (cb) => {
        const variables = await global.db.engine.find('custom.variables.watch');
        cb(null, _.orderBy(variables, 'order', 'asc'));
      });
      socket.on('set.value', async (opts, cb) => {
        const name = await global.customvariables.isVariableSetById(opts.id);
        if (name) {
          await global.customvariables.setValueOf(name, opts.value, { readOnlyBypass: true });
        }
        cb(null);
      });
    });
  }
}

export default CustomVariables;
export { CustomVariables };
