import { error, warning } from '~/helpers/log';

const systems = {
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
  core:         import('../_interface').Module[],
  systems:      import('../_interface').Module[],
  integrations: import('../_interface').Module[],
  games:        import('../_interface').Module[],
  widgets:      import('../_interface').Module[],
  registries:   import('../_interface').Module[],
  overlays:     import('../_interface').Module[],
  stats:        import('../_interface').Module[],
  services:     import('../_interface').Module[],
};

export const register = (type: keyof typeof systems, system: import('../_interface').Module) => {
  systems[type].push(system);
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

export const list = (type?: keyof typeof systems) => {
  if (!type) {
    const _list: import('../_interface').Module[] = [];
    for (const key of Object.keys(systems) as (keyof typeof systems)[]) {
      for (const mod of systems[key]) {
        _list.push(mod);
      }
    }
    return _list;
  }
  return systems[type];
};