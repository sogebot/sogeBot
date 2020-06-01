import { getFunctionNameFromStackTrace } from '../stacktrace';
import { debug } from '../log';
import { getFunctionList } from '../../decorators/on';
import { find } from '../register';

export function triggerInterfaceOnMessage(opts: onEventMessage) {
  trigger(opts);
}

export function triggerInterfaceOnSub(opts: onEventSub) {
  trigger(opts);
}

export function triggerInterfaceOnFollow(opts: onEventFollow) {
  trigger(opts);
}

export function triggerInterfaceOnTip(opts: onEventTip) {
  trigger(opts);
}

export function triggerInterfaceOnBit(opts: Omit<onEventTip, 'currency'>) {
  trigger(opts);
}

function trigger(opts: onEventMessage | onEventSub | onEventBit | onEventTip | onEventFollow) {
  const on_trigger: 'bit' | 'tip' | 'sub' | 'follow' | 'message' = getFunctionNameFromStackTrace().replace('triggerInterfaceOn', '').toLowerCase() as any;
  debug('trigger', `event ${on_trigger}`);

  for (const event of getFunctionList(on_trigger)) {
    const [ type, name ] = event.path.split('.');
    const self = find(type, name);
    if (!self) {
      throw new Error(`${type}.${name} not found in list`);
    }

    if (typeof (self as any)[event.fName] === 'function') {
      debug('trigger', `event ${on_trigger} => ${self.__moduleName__}`);
      (self as any)[event.fName](opts);
    }
  }
}