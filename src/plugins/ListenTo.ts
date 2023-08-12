import { debug } from '~/helpers/log';

export const ListenToGenerator = (pluginId: string, type: string, message: string, userstate: { userName: string, userId: string } | null) => ({
  Twitch: {
    command: (opts: { command: string }, callback: any) => {
      if (type === 'Twitch.command') {
        if (message.toLowerCase().startsWith(opts.command.toLowerCase())) {
          debug('plugins', `PLUGINS#${pluginId}: Twitch command executed`);
          callback(userstate, ...message.slice(0, opts.command.length - 1).split(' '));
        }
      }
    },
    message: (callback: any) => {
      if (type === 'Twitch.message') {
        debug('plugins', `PLUGINS#${pluginId}: Twitch message executed`);
        callback(userstate, message);
      }
    },
  },
});