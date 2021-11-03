import axios from 'axios';

import { get } from '../helpers/interfaceEmitter';
import Widget from './_interface';

import { getUserSender } from '~/helpers/commons';
import { sendMessage } from '~/helpers/commons/sendMessage';
import { adminEndpoint, publicEndpoint } from '~/helpers/socket';
import { getIgnoreList } from '~/helpers/user/isIgnored';

class Chat extends Widget {
  public sockets() {
    adminEndpoint(this.nsp, 'chat.message.send', async (message) => {
      const [ botId, botUsername ] = await Promise.all([
        get<string>('/services/twitch', 'botId'),
        get<string>('/services/twitch', 'botUsername'),
      ]);
      sendMessage(message, getUserSender(botId, botUsername), { force: true });
    });

    publicEndpoint(this.nsp, 'room', async (cb: (error: null, data: string) => void) => {
      const generalChannel = await get<string>('/services/twitch', 'generalChannel');
      cb(null, generalChannel.toLowerCase());
    });

    adminEndpoint(this.nsp, 'viewers', async (cb) => {
      try {
        const generalChannel = await get<string>('/services/twitch', 'generalChannel');
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
