import { parse } from 'path';

export function parser(opts: {
  fireAndForget?: boolean,
  permission?: string,
  priority?: number,
  dependsOn?: string[],
}) {
  opts = opts || {};
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[1].getFileName() || '');
  const name = path.name;
  const _type = path.dir.split('\\')[path.dir.split('\\').length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return (target: object, key: string, descriptor: PropertyDescriptor) => {
    registerParser(opts, { type, name, fnc: key });
    return descriptor;
  };
}

export function command(opts: string) {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[1].getFileName() || '');
  const name = path.name;
  const _type = path.dir.split('\\')[path.dir.split('\\').length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return (target: object, key: string, descriptor: PropertyDescriptor) => {
    registerCommand(opts, { type, name, fnc: key });
    return descriptor;
  };
}

export function default_permission(uuid: string) {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[1].getFileName() || '');
  const name = path.name;
  const _type = path.dir.split('\\')[path.dir.split('\\').length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    registerPermission(uuid, { type, name, fnc: key });
    return descriptor;
  };
}

export function helper() {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[1].getFileName() || '');
  const name = path.name;
  const _type = path.dir.split('\\')[path.dir.split('\\').length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    registerHelper({ type, name, fnc: key });
    return descriptor;
  };
}
function registerCommand(opts, m) {
  if (!global[m.type] || !global[m.type][m.name]) {
    return setTimeout(() => registerCommand(opts, m), 10);
  }
  const self = global[m.type][m.name];
  const c = self.prepareCommand(opts);
  c.fnc = m.fnc; // force function to decorated function
  self._commands.push(c);
  self._settings.commands[c.name] = c.name; // remap to default value
}

function registerPermission(uuid, m, retry = 0) {
  if (!global[m.type] || !global[m.type][m.name]) {
    return setTimeout(() => registerPermission(uuid, m), 10);
  }
  try {
    const self = global[m.type][m.name];
    // find command with function
    const c = self._commands.find((o) => o.fnc === m.fnc);
    if (!c) {
      throw Error();
    } else {
      c.permission = uuid;
    }
  } catch (e) {
    if (retry < 100) {
      return setTimeout(() => registerPermission(uuid, m, retry++), 10);
    } else {
      global.log.error('Command with function ' + m.fnc + ' not found!');
    }
  }
}

function registerHelper(m, retry = 0) {
  if (!global[m.type] || !global[m.type][m.name]) {
    return setTimeout(() => registerHelper(m), 10);
  }
  try {
    const self = global[m.type][m.name];
    // find command with function
    const c = self._commands.find((o) => o.fnc === m.fnc);
    if (!c) {
      throw Error();
    } else {
      c.isHelper = true;
    }
  } catch (e) {
    if (retry < 100) {
      return setTimeout(() => registerHelper(m, retry++), 10);
    } else {
      global.log.error('Command with function ' + m.fnc + ' not found!');
    }
  }
}

function registerParser(opts, m) {
  if (!global[m.type] || !global[m.type][m.name]) {
    return setTimeout(() => registerParser(opts, m), 10);
  }
  try {
    // tslint:disable-next-line:no-console
    console.log('registered', m.type, m.name, m.fnc);
    const self = global[m.type][m.name];
    self._parsers.push({
      name: m.fnc,
      permission: opts.permission,
      priority: opts.priority,
      dependsOn: opts.dependsOn,
      fireAndForget: opts.fireAndForget,
    });
  } catch (e) {
    global.log.error(e.stack);
  }
}
