import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'services::twitch::emotes': (type: 'explode' | 'firework', emotes: string[]) => void,

  'change': (path: string, value: any) => void,
  'load': (path: string, value: any) => void,

  'set': (nsp: string, variableName: string, value: unknown, cb?: () => void) => void,
}

class interfaceEmitter extends TypedEmitter<Events> {}
const emitter = new interfaceEmitter();
emitter.setMaxListeners(100);

export default emitter;