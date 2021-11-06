import emitter from './interfaceEmitter';

emitter.on('change', (path, value) => {
  variable.set(path, value);
});

emitter.on('load', (path, value) => {
  variable.set(path, value);
});

export const variable = new Map<string, unknown>();