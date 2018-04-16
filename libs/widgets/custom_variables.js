'use strict'

const debug = require('debug')
const _ = require('lodash')

class CustomVariablesWidget {
  constructor () {
    global.panel.addWidget('customvariables', 'widget-title-customvariables', 'fas fa-dollar-sign')
    this.sockets()

    require('cluster').on('message', (worker, message) => {
      if (message.type !== 'widget_custom_variables') return
      this.io.emit(message.emit) // send update to widget
    })
  }

  sockets () {
    const d = debug('CustomVariablesWidget:sockets')
    this.io = global.panel.io.of('/widgets/customVariables')

    this.io.on('connection', (socket) => {
      d('Socket /widgets/customVariables connected, registering sockets')
      socket.on('list.variables', async (callback) => {
        const variables = await global.db.engine.find('widgets.customVariables')
        callback(null, variables); d('list.variables => %j', variables)
      })
      socket.on('unwatch', async (name, callback) => {
        await global.db.engine.remove('widgets.customVariables', { name: String(name) })
        callback(null, name)
      })
      socket.on('save.values', async (data, cb) => {
        data.value = data.value.split(',').map((o) => o.trim()).filterNamedNodeMap(String).join(', ')
        await global.db.engine.update('widgets.customVariables', { name: data.name }, { value: data.value })
        global.api.setTitleAndGame(global.api, null) // update title
        cb(null, data)
      })
      socket.on('load.variable', async (variable, callback) => {
        variable = await global.db.engine.findOne('customvars', { key: variable })
        callback(null, variable) // { key: 'variable_name', 'value': 'current_value'}
      })
      socket.on('save.variable', async (data, cb) => {
        await global.db.engine.update('customvars', { key: data.key }, { value: data.value })
        global.api.setTitleAndGame(global.api, null) // update title
        cb(null, data)
      })
      socket.on('watch', async (data, callback) => {
        // data = { 'type': 'options|number|text', 'name': 'name-of-variable' }
        if (_.get(data, 'name', '').length === 0) return callback(new Error(), 'Name cannot be empty')
        data.name = data.name.replace(/ /g, '_')

        if (!data.name.match(/^[a-zA-Z0-9_]+$/)) return callback(new Error(), 'Name must contain only a-z, A-Z, 0-9 and _ chars')

        await global.db.engine.insert('widgets.customVariables', data)
        callback(null, data)
      })
    })
  }
}

module.exports = new CustomVariablesWidget()
