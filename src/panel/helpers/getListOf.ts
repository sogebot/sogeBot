import { getSocket } from '@sogebot/ui-helpers/socket';

export interface getListOfReturn {
  systems: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
  core: { name: string }[];
  integrations: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
  overlays: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
  games: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  }[];
}

type possibleLists = 'systems' | 'core' | 'integrations' | 'overlays' | 'games';

const list: getListOfReturn = {
  systems:      [],
  core:         [],
  integrations: [],
  overlays:     [],
  games:        [],
};
export const populateListOf = async function<P extends possibleLists>(type: P): Promise<void> {
  return new Promise<void>((resolve) => {
    getSocket('/').emit(type, (err: string | null, data: getListOfReturn['systems']) => {
      if (err) {
        console.error(err);
      }
      while (list[type].length > 0) {
        list[type].shift();
      }
      for (const v of data) {
        list[type].push(v);
      }
      list[type] = data;
      resolve();
    });
  });
};

export const getListOf = function<P extends possibleLists>(type: P): getListOfReturn[P] {
  return list[type];
};
