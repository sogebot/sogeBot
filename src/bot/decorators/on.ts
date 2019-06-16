import { set, get } from 'lodash';
import { parse, sep as separator } from 'path';

export function onChange(variableArg: string) {
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
        const on = get(self, `on.change.${variableArg}`, []);
        on.push(key);
        set(self, `on.change.${variableArg}`, on);
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
        const on = get(self, `on.load.${fncNameArg}`, []);
        on.push(key);
        set(self, `on.load.${fncNameArg}`, on);
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
        const on = get(self, `on.message`, []);
        on.push(key);
        set(self, `on.message`, on);
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
        const on = get(self, `on.streamEnd`, []);
        on.push(key);
        set(self, `on.streamEnd`, on);
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
        const on = get(self, `on.tip`, []);
        on.push(key);
        set(self, `on.tip`, on);
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
        const on = get(self, `on.follow`, []);
        on.push(key);
        set(self, `on.follow`, on);
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
        const on = get(self, `on.sub`, []);
        on.push(key);
        set(self, `on.sub`, on);
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
        const on = get(self, `on.bit`, []);
        on.push(key);
        set(self, `on.bit`, on);
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
