import { set } from 'lodash';
import { parse, sep as separator } from 'path';

export function onChange(fncNameArg: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.change.${key}`, fncNameArg);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

export function onLoad(fncNameArg: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.load.${key}`, fncNameArg);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

export function onMessage() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.message.${key}`, key);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

export function onStreamEnd() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.streamEnd.${key}`, key);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

export function onTip() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.tip.${key}`, key);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

export function onFollow() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.follow.${key}`, key);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

export function onSub() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.sub.${key}`, key);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

export function onBit() {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (target: object, key: string) => {
    const register = () => {
      const isAvailableModule = type !== 'core' && typeof global[type] !== 'undefined' && typeof global[type][name] !== 'undefined';
      const isAvailableLibrary = type === 'core' && typeof global[name] !== 'undefined';
      if (!isAvailableLibrary && !isAvailableModule) {
        return setTimeout(() => register(), 1000);
      }

      try {
        const self = type === 'core' ? global[name] : global[type][name];
        set(self, `on.bit.${key}`, key);
      } catch (e) {
        console.error(e);
      }
    };
    register();
  };
}

function getNameAndTypeFromStackTrace() {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_s, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[2].getFileName() || '');
  const name = path.name;
  const _type = path.dir.split(separator)[path.dir.split(separator).length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return { name, type };
}
