import { parse, sep as separator } from 'path';

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
  const _type = path.dir.split(separator)[path.dir.split(separator).length - 1];
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
  const _type = path.dir.split(separator)[path.dir.split(separator).length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return (target: object, key: string, descriptor: PropertyDescriptor) => {
    registerCommand(opts, { type, name, fnc: key });
    return descriptor;
  };
}

export function default_permission(uuid: string | null) {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, s) => s;
  const stack = (new Error().stack as unknown as NodeJS.CallSite[]);
  Error.prepareStackTrace = _prepareStackTrace;

  const path = parse(stack[1].getFileName() || '');
  const name = path.name;
  const _type = path.dir.split(separator)[path.dir.split(separator).length - 1];
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
  const _type = path.dir.split(separator)[path.dir.split(separator).length - 1];
  const type = _type === 'dest' ? 'core' : _type;

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    registerHelper({ type, name, fnc: key });
    return descriptor;
  };
}

async function registerCommand(opts, m) {
  const isAvailableModule = m.type !== 'core' && typeof global[m.type] !== 'undefined' && typeof global[m.type][m.name] !== 'undefined';
  const isAvailableLibrary = m.type === 'core' && typeof global[m.name] !== 'undefined';
  if (!isAvailableLibrary && !isAvailableModule) {
    return setTimeout(() => registerCommand(opts, m), 1000);
  }
  try {
    const self = m.type === 'core' ? global[m.name] : global[m.type][m.name];
    const c = self.prepareCommand(opts);
    c.fnc = m.fnc; // force function to decorated function

    if (typeof self._commands === 'undefined') {
      self._commands = [];
    }

    if (typeof self._settings.commands === 'undefined') {
      self._settings.commands = {};
    }

    self._settings.commands[c.name] = c.name; // remap to default value

    // load command from db
    const dbc = await global.db.engine.findOne(self.collection.settings, { system: m.name, key: 'commands.' + c.name });
    if (dbc.value) {
      if (c.name === dbc.value) {
        // remove if default value
        await global.db.engine.remove(self.collection.settings, { system: m.name, key: 'commands.' + c.name });
      }
      c.command = dbc.value;
    }
    self._commands.push(c);
  } catch (e) {
    global.log.error(e);
  }
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
