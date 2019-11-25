import { getFunctionNameFromStackTrace } from '../stacktrace';
import { debug } from '../log';
import { getFunctionList } from '../../decorators/on';

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
    let self;
    if (event.path.startsWith('core')) {
      self = (require(`../../${event.path.split('.')[1]}`)).default;
    } else {
      self = (require(`../../${event.path.split('.')[0]}/${event.path.split('.')[1]}`)).default;
    }

    if (typeof self[event.fName] === 'function') {
      debug('trigger', `event ${on_trigger} => ${self.constructor.name}`);
      self[event.fName](opts);
    }
  }
}