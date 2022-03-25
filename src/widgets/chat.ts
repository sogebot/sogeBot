import axios from 'axios';

import Widget from './_interface';

import { getUserSender } from '~/helpers/commons';
import { sendMessage } from '~/helpers/commons/sendMessage';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import { getIgnoreList } from '~/helpers/user/isIgnored';
import { variables } from '~/watchers';

class Chat extends Widget {
  public sockets() {
    adminEndpoint('/widgets/chat', 'chat.message.send', async (message) => {
      const botUsername = variables.get('services.twitch.botUsername') as string;
      const botId = variables.get('services.twitch.botId') as string;
      sendMessage(message, getUserSender(botId, botUsername), { force: true });
    });

    publicEndpoint('/widgets/chat', 'room', async (cb: (error: null, data: string) => void) => {
      const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
      cb(null, broadcasterUsername.toLowerCase());
    });

    adminEndpoint('/widgets/chat', 'viewers', async (cb) => {
      try {
        const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
        const url = `https://tmi.twitch.tv/group/user/${broadcasterUsername.toLowerCase()}/chatters`;
        const response = await axios.get<{chatters: { viewers: string[] }}>(url);

        if (response.status === 200) {
          const chatters = response.data.chatters;
          chatters.viewers = chatters.viewers.filter((o) => !getIgnoreList().includes(o));
          cb(null, { chatters });
        }
      } catch (e: any) {
        cb(e.message, { chatters: [] });
      }
    });
  }
}

export default new Chat();
