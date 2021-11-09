import { error, warning } from '~/helpers/log';

export const core: import('../_interface').Module[] = [];
export const systems: import('../_interface').Module[] = [];
export const integrations: import('../_interface').Module[] = [];
export const games: import('../_interface').Module[] = [];
export const widgets: import('../_interface').Module[] = [];
export const registries: import('../_interface').Module[] = [];
export const overlays: import('../_interface').Module[] = [];
export const stats: import('../_interface').Module[] = [];
export const services: import('../_interface').Module[] = [];

export const register = (type: 'core' | 'systems' | 'integrations' | 'games' | 'widgets' | 'registries' | 'overlays' | 'stats' | 'services', system: import('../_interface').Module) => {
  switch(type) {
    case 'core':
      core.push(system);
      break;
    case 'systems':
      systems.push(system);
      break;
    case 'integrations':
      integrations.push(system);
      break;
    case 'games':
      games.push(system);
      break;
    case 'widgets':
      widgets.push(system);
      break;
    case 'registries':
      registries.push(system);
      break;
    case 'overlays':
      overlays.push(system);
      break;
    case 'stats':
      stats.push(system);
      break;
    case 'services':
      services.push(system);
      break;
    default:
      throw new Error(`Unknown type ${type} to register`);
  }
};

export const find = (type: string, name: string) => {
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

export const list = (type: null | string) => {
  switch(type) {
    case 'core':
      return core;
    case 'systems':
      return systems;
    case 'integrations':
      return integrations;
    case 'games':
      return games;
    case 'widgets':
      return widgets;
    case 'registries':
      return registries;
    case 'overlays':
      return overlays;
    case 'stats':
      return stats;
    case 'services':
      return services;
    default:
      throw new Error(`Unknown type ${type} to register`);
  }
};