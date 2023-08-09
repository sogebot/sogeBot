import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'debug': (message: string) => void
  'warning': (message: string) => void
  'error': (message: string) => void
}

class _logEmitter extends TypedEmitter<Events> {}
const logEmitter = new _logEmitter();

export { logEmitter };
