import { getUserSender } from '~/helpers/commons';
import { sendMessage } from '~/helpers/commons/sendMessage';
import { info } from '~/helpers/log';
import banUser from '~/services/twitch/calls/banUser';

export const TwitchGenerator = (pluginId: string, userstate: { userName: string, userId: string } | null) => ({
  sendMessage: (message:string) => {
    if (userstate) {
      sendMessage(message, getUserSender(userstate.userId, userstate.userName));
    }
  },
  timeout: async  (userId: string, timeout: number, reason?: string) => {
    info(reason
      ? `PLUGINS#${pluginId}: Timeouting user ${userId} for ${timeout}s with reason: ${reason}`
      : `PLUGINS#${pluginId}: Timeouting user ${userId} for ${timeout}s`);
    banUser(userId, reason, Number(timeout));
  },
});