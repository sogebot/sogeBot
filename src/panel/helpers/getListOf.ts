import { getSocket } from 'src/panel/helpers/socket';

interface getListOfReturn {
  systems: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  };
  core: { name: string };
  integrations: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  };
  overlays: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  };
  games: {
    name: string; enabled: boolean; areDependenciesEnabled: boolean; isDisabledByEnv: boolean;
  };
}

type possibleLists = 'systems' | 'core' | 'integrations' | 'overlays' | 'games';


export const getListOf = async function<P extends possibleLists>(type: P): Promise<getListOfReturn[P][]> {
  // save userId to db
  return new Promise((resolve) => {
    getSocket('/').emit(type, (err: string | null, data: getListOfReturn[P][]) => {
      if (err) {
        console.error(err);
      }
      resolve(data);
    });
  });
};
