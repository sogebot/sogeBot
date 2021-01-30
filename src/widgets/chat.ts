import axios from 'axios';

import { sendMessage } from '../helpers/commons/sendMessage';
import { botId } from '../helpers/oauth/botId';
import { generalChannel } from '../helpers/oauth/generalChannel';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { getIgnoreList } from '../helpers/user/isIgnored';
import OAuth from '../oauth';
import Widget from './_interface';

class Chat extends Widget {
  public sockets() {
    adminEndpoint(this.nsp, 'chat.message.send', async (message) => {
      sendMessage(message, {
        username:       OAuth.botUsername,
        displayName:    OAuth.botUsername,
        userId:         botId.value,
        emotes:         [],
        badges:         {},
        'message-type': 'chat',
      }, { force: true });
    });

    publicEndpoint(this.nsp, 'room', async (cb: (error: null, data: string) => void) => {
      cb(null, generalChannel.value.toLowerCase());
    });

    adminEndpoint(this.nsp, 'viewers', async (cb) => {
      try {
        const url = `https://tmi.twitch.tv/group/user/${generalChannel.value.toLowerCase()}/chatters`;
        const response = await axios.get(url);

        if (response.status === 200) {
          const chatters = response.data.chatters as { viewers: string[] };
          chatters.viewers = chatters.viewers.filter((o) => !getIgnoreList().includes(o));
          cb(null, { chatters });
        }
      } catch (e) {
        cb(e.message, {});
      }
    });
  }
}

export default new Chat();
