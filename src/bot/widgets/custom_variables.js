'use strict'

const _ = require('lodash')

class CustomVariablesWidget {
  constructor () {
    global.panel.addWidget('customvariables', 'widget-title-customvariables', 'fas fa-dollar-sign')
    this.sockets()

    require('cluster').on('message', (worker, message) => {
      if (message.type !== 'widget_custom_variables') return
      global.panel.io.of('/widgets/customVariables').emit(message.emit) // send update to widget
    })
  }

  sockets () {
    global.panel.io.of('/widgets/customVariables').on('connection', (socket) => {
      this.socket = socket // expose for custom variables lib refresh
      socket.on('list.variables', async (cb) => {
        const variables = await global.db.engine.find('custom.variables')
        cb(null, variables)
      })
      socket.on('list.watch', async (cb) => {
        const variables = await global.db.engine.find('custom.variables.watch')
        cb(null, _.orderBy(variables, 'order', 'asc'))
      })
      socket.on('move.up', async (variableId, cb) => {
        let variableToMoveUp = await global.db.engine.findOne('custom.variables.watch', { variableId })
        let variableToMoveDown = await global.db.engine.findOne('custom.variables.watch', { order: variableToMoveUp.order - 1 })
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveUp.variableId }, { order: variableToMoveUp.order - 1 })
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveDown.variableId }, { order: variableToMoveDown.order + 1 })
        cb(null, variableId)
      })
      socket.on('move.down', async (variableId, cb) => {
        let variableToMoveDown = await global.db.engine.findOne('custom.variables.watch', { variableId })
        let variableToMoveUp = await global.db.engine.findOne('custom.variables.watch', { order: variableToMoveDown.order + 1 })
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveUp.variableId }, { order: variableToMoveUp.order - 1 })
        await global.db.engine.update('custom.variables.watch', { variableId: variableToMoveDown.variableId }, { order: variableToMoveDown.order + 1 })
        cb(null, variableId)
      })
      socket.on('add.watch', async (variableId, cb) => {
        const variables = await global.db.engine.find('custom.variables.watch')
        const order = variables.length
        await global.db.engine.update('custom.variables.watch', { variableId }, { variableId, order })
        cb(null, variableId)
      })
      socket.on('rm.watch', async (variableId, cb) => {
        await global.db.engine.remove('custom.variables.watch', { variableId })
        // force reorder
        let variables = _.orderBy((await global.db.engine.find('custom.variables.watch')).map((o) => { o._id = o._id.toString(); return o }), 'order', 'asc')
        for (let order = 0; order < variables.length; order++) await global.db.engine.update('custom.variables.watch', { _id: variables[order]._id }, { order })
        cb(null, variableId)
      })
      socket.on('set.value', async (opts, cb) => {
        let name = await global.customvariables.isVariableSetById(opts._id)
        if (name) await global.customvariables.setValueOf(name, opts.value, { readOnlyBypass: true })
        cb(null)
      })
    })
  }
}

module.exports = new CustomVariablesWidget()
