import {
  isBoolean, isNumber, isString,
} from 'lodash-es';

import { find } from '../register.js';

async function setValue(opts: CommandOptions) {
  // get value so we have a type
  const splitted = opts.parameters.split(' ');
  const pointer = splitted.shift();
  let newValue = splitted.join(' ');
  if (!pointer) {
    return [{ response: `$sender, settings does not exists`, ...opts }];
  }

  const [ type, module ] = pointer.split('.');
  const self = find(type as any, module);
  if (!self) {
    throw new Error(`${type}.${module} not found in list`);
  }

  const currentValue = (self as any)[pointer.split('.')[2]];
  if (typeof currentValue !== 'undefined') {
    if (isBoolean(currentValue)) {
      newValue = newValue.toLowerCase().trim();
      if (['true', 'false'].includes(newValue)) {
        (self as any)[pointer.split('.')[2]] = newValue === 'true';
        return [{ response: `$sender, ${pointer} set to ${newValue}`, ...opts }];
      } else {
        return [{ response: `$sender, !set error: bool is expected`, ...opts }];
      }
    } else if (isNumber(currentValue)) {
      if (isFinite(Number(newValue))) {
        (self as any)[pointer.split('.')[2]] = Number(newValue);
        return [{ response: `$sender, ${pointer} set to ${newValue}`, ...opts }];
      } else {
        return [{ response: `$sender, !set error: number is expected`, ...opts }];
      }
    } else if (isString(currentValue)) {
      (self as any)[pointer.split('.')[2]] = newValue;
      return [{ response: `$sender, ${pointer} set to '${newValue}'`, ...opts }];
    } else {
      return [{ response: `$sender, ${pointer} is not supported settings to change`, ...opts }];
    }
  } else {
    return [{ response: `$sender, ${pointer} settings not exists`, ...opts }];
  }
}

export { setValue };