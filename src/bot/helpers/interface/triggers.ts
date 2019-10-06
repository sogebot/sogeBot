import { getFunctionNameFromStackTrace } from '../stacktrace';
import { debug } from '../log';

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

export function triggerInterfaceOnBit(opts: onEventTip) {
  trigger(opts);
}

function trigger(opts: onEventMessage | onEventSub | onEventBit | onEventTip | onEventFollow) {
  const on_trigger = getFunctionNameFromStackTrace().replace('triggerInterfaceOn', '').toLowerCase();
  debug('trigger', `event ${on_trigger}`);
  for (const system of [
    ...Object.values(global.systems),
    ...Object.values(global.games),
    ...Object.values(global.overlays),
    ...Object.values(global.widgets),
    ...Object.values(global.integrations),
    ...Object.values(global.registries),
  ]) {
    if (system.constructor.name.startsWith('_') || typeof system.on === 'undefined') {
      continue;
    }
    if (Array.isArray(system.on[on_trigger])) {
      for (const fnc of system.on[on_trigger]) {
        debug('trigger', `event ${on_trigger} => ${system.constructor.name}`);
        system[fnc](opts);
      }
    }
  }
}