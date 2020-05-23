import { parse, sep as separator } from 'path';

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
  reconnectChannel: onEvent[];
  sub: onEvent[];
  follow: onEvent[];
  bit: onEvent[];
  tip: onEvent[];
};

const on: onEvents = {
  streamStart: [],
  streamEnd: [],
  change: [],
  load: [],
  startup: [],
  message: [],
  joinChannel: [],
  partChannel: [],
  reconnectChannel: [],
  sub: [],
  follow: [],
  bit: [],
  tip: [],
};

export function getFunctionList(type: keyof onEvents, path = ''): onEvent[] {
  if (path === '') {
    return on[type];
  } else {
    return on[type].filter(o => o.path.includes(path));
  }
}

export function onChange(variableArg: string) {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.change.push({ path: path + '.' + variableArg, fName });
  };
}

export function onLoad(variableArg: string) {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.load.push({ path: path + '.' + variableArg, fName });
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

export function onReconnectChannel() {
  const { name, type } = getNameAndTypeFromStackTrace();
  return (target: any, fName: string) => {
    const path = type === 'core' ? name : `${type}.${name.toLowerCase()}`;
    on.reconnectChannel.push({ path, fName });
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
  const name = path.name;
  const _type = path.dir.split(separator)[path.dir.split(separator).length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return { name, type };
}
