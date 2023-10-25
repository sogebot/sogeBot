import { info, warning } from '~/helpers/log.js';

export const LogGenerator = (pluginId: string, fileName: string) => ({
  info: async (message: string) => {
    info(`PLUGINS#${pluginId}:./${fileName}: ${message}`);
  },
  warning: async (message: string) => {
    warning(`PLUGINS#${pluginId}:./${fileName}: ${message}`);
  },
});