import axios from 'axios';

import { getIgnoreList, sendMessage } from '../commons';
import Widget from './_interface';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import OAuth from '../oauth';

class Chat extends Widget {
  constructor() {
    super();
    this.addWidget('chat', 'widget-title-chat', 'fas fa-comments');
  }

  public sockets() {
    adminEndpoint(this.nsp, 'chat.message.send', async (message) => {
      sendMessage(message, {
        username: OAuth.botUsername,
        displayName: OAuth.botUsername,
        userId: Number(OAuth.botId),
        emotes: [],
        badges: {},
        'message-type': 'chat',
      }, { force: true });
    });

    publicEndpoint(this.nsp, 'room', async (cb: (error: null, data: string) => void) => {
      cb(null, OAuth.generalChannel.toLowerCase());
    });

    adminEndpoint(this.nsp, 'viewers', async (cb) => {
      try {
        const url = `https://tmi.twitch.tv/group/user/${(await OAuth.generalChannel).toLowerCase()}/chatters`;
        const response = await axios.get(url);

        if (response.status === 200) {
          const chatters = response.data.chatters as { viewers: string[] };
          chatters.viewers = chatters.viewers.filter((o) => !getIgnoreList().includes(o));
          cb(null, {chatters});
        }
      } catch (e) {
        cb(e.message, {});
      }
    });
  }
}

export default new Chat();
