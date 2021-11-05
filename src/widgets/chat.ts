import axios from 'axios';

import Widget from './_interface';

import { getUserSender } from '~/helpers/commons';
import { sendMessage } from '~/helpers/commons/sendMessage';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import { getIgnoreList } from '~/helpers/user/isIgnored';
import { variable } from '~/helpers/variables';

class Chat extends Widget {
  public sockets() {
    adminEndpoint(this.nsp, 'chat.message.send', async (message) => {
      const botUsername = variable.get('services.twitch.botUsername') as string;
      const botId = variable.get('services.twitch.botId') as string;
      sendMessage(message, getUserSender(botId, botUsername), { force: true });
    });

    publicEndpoint(this.nsp, 'room', async (cb: (error: null, data: string) => void) => {
      const generalChannel = variable.get('services.twitch.generalChannel') as string;
      cb(null, generalChannel.toLowerCase());
    });

    adminEndpoint(this.nsp, 'viewers', async (cb) => {
      try {
        const generalChannel = variable.get('services.twitch.generalChannel') as string;
        const url = `https://tmi.twitch.tv/group/user/${generalChannel.toLowerCase()}/chatters`;
        const response = await axios.get<{chatters: { viewers: string[] }}>(url);

        if (response.status === 200) {
          const chatters = response.data.chatters;
          chatters.viewers = chatters.viewers.filter((o) => !getIgnoreList().includes(o));
          cb(null, { chatters });
        }
      } catch (e: any) {
        cb(e.message, {});
      }
    });
  }
}

export default new Chat();
