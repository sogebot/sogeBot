'use strict'

const _ = require('lodash')
import { permission } from './permissions';
import Core from './_interface';

class Configuration extends Core {
  async setValue (opts) {
    // get value so we have a type
    let splitted = opts.parameters.split(' ')
    const pointer = splitted.shift()
    let newValue = splitted.join(' ')
    let currentValue = await _.get(global, pointer, undefined)
    if (typeof currentValue !== 'undefined') {
      if (_.isBoolean(currentValue)) {
        newValue = newValue.toLowerCase().trim()
        if (['true', 'false'].includes(newValue)) {
          _.set(global, pointer, newValue === 'true')
          global.commons.sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender)
        } else {
          global.commons.sendMessage('$sender, !set error: bool is expected', opts.sender)
        }
      } else if (_.isNumber(currentValue)) {
        if (_.isFinite(Number(newValue))) {
          _.set(global, pointer, Number(newValue))
          global.commons.sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender)
        } else {
          global.commons.sendMessage('$sender, !set error: number is expected', opts.sender)
        }
      } else if (_.isString(currentValue)) {
        _.set(global, pointer, newValue)
        global.commons.sendMessage(`$sender, ${pointer} set to '${newValue}'`, opts.sender)
      } else {
        global.commons.sendMessage(`$sender, ${pointer} is not supported settings to change`, opts.sender)
      }
    } else global.commons.sendMessage(`$sender, ${pointer} settings not exists`, opts.sender)
  }

  async getValue (cfgName) {
    let item = await global.db.engine.findOne('settings', { key: cfgName })
    try {
      if (_.isEmpty(item)) return this.cfgL[cfgName].value // return default value if not saved
      if (_.includes(['true', 'false'], item.value.toString().toLowerCase())) return item.value.toString().toLowerCase() === 'true'
      else return item.value
    } catch (e) {
      global.log.error(`Error when loading ${cfgName} value`)
      global.log.error(e.stack)
      return null
    }
  }
}

module.exports = Configuration
