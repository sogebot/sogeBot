import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'reconnect': (type: 'bot' | 'broadcaster') => void,
  'part': (type: 'bot' | 'broadcaster') => void,
}

class _TMIEmitter extends TypedEmitter<Events> {}
const tmiEmitter = new _TMIEmitter();

export { tmiEmitter };