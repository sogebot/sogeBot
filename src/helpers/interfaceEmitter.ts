import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'get': (nsp: string, variableName: string, cb: (value: any) => void) => void,
  'set': (nsp: string, variableName: string, value: unknown, cb?: () => void) => void,
  'twitch::api::init': (type: 'broadcaster' | 'bot') => void,
}

class interfaceEmitter extends TypedEmitter<Events> {}
const emitter = new interfaceEmitter();

const get = async <T>(nsp: string, variableName: string): Promise<T> => {
  return new Promise((resolve: (value: T) => void) => emitter.emit('get', nsp, variableName, resolve));
};

export default emitter;
export { get };