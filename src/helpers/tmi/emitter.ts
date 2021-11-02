import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'get::whisperListener': (cb: (value: boolean) => void) => void,
  'reconnect': (type: 'bot' | 'broadcaster') => void,
  'part': (type: 'bot' | 'broadcaster') => void,
}

class _TMIEmitter extends TypedEmitter<Events> {}
const tmiEmitter = new _TMIEmitter();

export { tmiEmitter };