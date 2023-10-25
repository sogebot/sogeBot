import { error, warning } from '~/helpers/log.js';

export const systems = {
  core:         [],
  systems:      [],
  integrations: [],
  games:        [],
  widgets:      [],
  registries:   [],
  overlays:     [],
  stats:        [],
  services:     [],
} as {
  core:         import('../_interface.js').Module[],
  systems:      import('../_interface.js').Module[],
  integrations: import('../_interface.js').Module[],
  games:        import('../_interface.js').Module[],
  widgets:      import('../_interface.js').Module[],
  registries:   import('../_interface.js').Module[],
  overlays:     import('../_interface.js').Module[],
  stats:        import('../_interface.js').Module[],
  services:     import('../_interface.js').Module[],
};

export const register = (type: keyof typeof systems, system: import('../_interface.js').Module) => {
  systems[type].push(system);
};

export const list = (type?: keyof typeof systems) => {
  if (!type) {
    const _list: import('../_interface.js').Module[] = [];
    for (const key of Object.keys(systems) as (keyof typeof systems)[]) {
      for (const mod of systems[key]) {
        _list.push(mod);
      }
    }
    return _list;
  }
  return systems[type];
};

export const find = (type: keyof typeof systems, name: string) => {
  return list(type).find(m => {
    try {
      if (typeof m.__moduleName__ === 'undefined') {
        throw new Error('Module name undefined');
      }
      if (m.__moduleName__ === null) {
        warning(`Some modules are not loaded yet`);
      }
      return String(m.__moduleName__).toLowerCase() === name.toLowerCase();
    } catch (e: any) {
      error(e);
    }
  });
};