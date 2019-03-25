'use strict'

const _ = require('lodash')
import Core from './_interface';
import { sendMessage } from './commons';

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
          sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender)
        } else {
          sendMessage('$sender, !set error: bool is expected', opts.sender)
        }
      } else if (_.isNumber(currentValue)) {
        if (_.isFinite(Number(newValue))) {
          _.set(global, pointer, Number(newValue))
          sendMessage(`$sender, ${pointer} set to ${newValue}`, opts.sender)
        } else {
          sendMessage('$sender, !set error: number is expected', opts.sender)
        }
      } else if (_.isString(currentValue)) {
        _.set(global, pointer, newValue)
        sendMessage(`$sender, ${pointer} set to '${newValue}'`, opts.sender)
      } else {
        sendMessage(`$sender, ${pointer} is not supported settings to change`, opts.sender)
      }
    } else sendMessage(`$sender, ${pointer} settings not exists`, opts.sender)
  }
}

module.exports = Configuration
