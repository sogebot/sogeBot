import { getFunctionList } from '../../decorators/on.js';
import { debug } from '../log.js';
import { find } from '../register.js';

export function triggerInterfaceOnMessage(opts: onEventMessage) {
  trigger(opts, 'message');
}

export function triggerInterfaceOnSub(opts: onEventSub) {
  trigger(opts, 'sub');
}

export function triggerInterfaceOnFollow(opts: onEventFollow) {
  trigger(opts, 'follow');
}

export function triggerInterfaceOnTip(opts: onEventTip) {
  trigger(opts, 'tip');
}

export function triggerInterfaceOnBit(opts: Omit<onEventTip, 'currency'>) {
  trigger(opts, 'bit');
}

function trigger(opts: onEventMessage | onEventSub | onEventBit | onEventTip | onEventFollow, on: 'bit' | 'tip' | 'sub' | 'follow' | 'message') {
  debug('trigger', `event ${on}`);

  for (const event of getFunctionList(on)) {
    const [ type, name ] = event.path.split('.');
    const self = find(type as any, name);
    if (!self) {
      throw new Error(`${type}.${name} not found in list`);
    }

    if (typeof (self as any)[event.fName] === 'function') {
      debug('trigger', `event ${on} => ${self.__moduleName__}`);
      (self as any)[event.fName](opts);
    }
  }
}