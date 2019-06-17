'use strict';

import _ from 'lodash';
import Widget from './_interface';

class CustomVariables extends Widget {
  constructor() {
    super();
    this.addWidget('customvariables', 'widget-title-customvariables', 'fas fa-dollar-sign');

    require('cluster').on('message', (worker, message) => {
      if (message.type !== 'widget_custom_variables') { return; }
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
      socket.on('move.up', async (variableId, cb) => {
        const variableToMoveUp = await global.db.engine.findOne('custom.variables.watch', { variableId });
        const variableToMoveDown = await global.db.engine.findOne('custom.variables.watch', { order: variableToMoveUp.order - 1 });
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveUp.variableId }, { order: variableToMoveUp.order - 1 });
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveDown.variableId }, { order: variableToMoveDown.order + 1 });
        cb(null, variableId);
      });
      socket.on('move.down', async (variableId, cb) => {
        const variableToMoveDown = await global.db.engine.findOne('custom.variables.watch', { variableId });
        const variableToMoveUp = await global.db.engine.findOne('custom.variables.watch', { order: variableToMoveDown.order + 1 });
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveUp.variableId }, { order: variableToMoveUp.order - 1 });
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveDown.variableId }, { order: variableToMoveDown.order + 1 });
        cb(null, variableId);
      });
      socket.on('add.watch', async (variableId, cb) => {
        const variables = await global.db.engine.find('custom.variables.watch');
        const order = variables.length;
        await global.db.engine.update('custom.variables.watch', { variableId }, { variableId, order });
        cb(null, variableId);
      });
      socket.on('rm.watch', async (variableId, cb) => {
        await global.db.engine.remove('custom.variables.watch', { variableId });
        // force reorder
        const variables = _.orderBy((await global.db.engine.find('custom.variables.watch')).map((o) => { o._id = o._id.toString(); return o; }), 'order', 'asc');
        for (let order = 0; order < variables.length; order++) { await global.db.engine.update('custom.variables.watch', { _id: variables[order]._id }, { order }); }
        cb(null, variableId);
      });
      socket.on('set.value', async (opts, cb) => {
        const name = await global.customvariables.isVariableSetById(opts._id);
        if (name) { await global.customvariables.setValueOf(name, opts.value, { readOnlyBypass: true }); }
        cb(null);
      });
    });
  }
}

export default CustomVariables;
export { CustomVariables };
