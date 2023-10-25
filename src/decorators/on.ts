import { normalize, parse } from 'path';

type onEvent = { path: string; fName: string };
type onEvents = {
  streamStart: onEvent[];
  streamEnd: onEvent[];
  change: onEvent[];
  load: onEvent[];
  startup: onEvent[];
  message: onEvent[];
  joinChannel: onEvent[];
  partChannel: onEvent[];
  sub: onEvent[];
  follow: onEvent[];
  bit: onEvent[];
  tip: onEvent[];
};

const on: onEvents = {
  streamStart: [],
  streamEnd:   [],
  change:      [],
  load:        [],
  startup:     [],
  message:     [],
  joinChannel: [],
  partChannel: [],
  sub:         [],
  follow:      [],
  bit:         [],
  tip:         [],
};

export function getFunctionList(type: keyof onEvents, path = ''): onEvent[] {
  if (path === '') {
    return on[type];
  } else {
    return on[type].filter(o => o.path === path);
  }
}

export function onChange(variableArg: string | string[]) {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    if (Array.isArray(variableArg)) {
      for (const variable of variableArg) {
        on.change.push({ path: path + '.' + variable, fName });
      }
    } else {
      on.change.push({ path: path + '.' + variableArg, fName });
    }
  };
}

export function onLoad(variableArg: string | string[]) {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    if (Array.isArray(variableArg)) {
      for (const variable of variableArg) {
        on.load.push({ path: path + '.' + variable, fName });
      }
    } else {
      on.load.push({ path: path + '.' + variableArg, fName });
    }
  };
}

export function onStartup() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.startup.push({ path, fName });
  };
}

export function onMessage() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.message.push({ path, fName });
  };
}

export function onStreamStart() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.streamStart.push({ path, fName });
  };
}

export function onStreamEnd() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.streamEnd.push({ path, fName });
  };
}

export function onJoinChannel() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.joinChannel.push({ path, fName });
  };
}

export function onPartChannel() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.partChannel.push({ path, fName });
  };
}

export function onTip() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.tip.push({ path, fName });
  };
}

export function onFollow() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.follow.push({ path, fName });
  };
}

export function onSub() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.sub.push({ path, fName });
  };
}

export function onBit() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.bit.push({ path, fName });
  };
}

function getNameAndTypeFromStackTrace() {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_s, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[2].getFileName() || '');
  const dir = normalize(path.dir).replace(/\\/g, '/');
  const _type = dir.split('/')[dir.split('/').length - 1];
  const type = (_type === 'dest' ? 'core' : _type);
  const name = path.name;

  return { name, type };
}
