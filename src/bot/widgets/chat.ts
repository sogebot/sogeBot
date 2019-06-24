import axios from 'axios';

import { getIgnoreList, sendMessage } from '../commons';
import Widget from './_interface';

class Chat extends Widget {
  constructor() {
    super();
    this.addWidget('chat', 'widget-title-chat', 'fas fa-comments');
  }

  public sockets() {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
    this.socket.on('connection', (socket) => {
      socket.on('chat.message.send', async (message) => {
        const userObj = await global.users.getByName(global.oauth.botUsername);
        sendMessage(message, {
          username: userObj.username,
          displayName: userObj.displayName || userObj.username,
          userId: userObj.id,
          emotes: [],
          badges: {},
          'message-type': 'chat'
        }, { force: true });
      });

      socket.on('room', (cb) => {
        cb(null, global.oauth.generalChannel.toLowerCase());
      });

      socket.on('viewers', async (cb) => {
        try {
          const url = `https://tmi.twitch.tv/group/user/${(await global.oauth.generalChannel).toLowerCase()}/chatters`;
          const response = await axios.get(url);

          if (response.status === 200) {
            const chatters = response.data.chatters;
            chatters.viewers = chatters.viewers.filter((o) => !getIgnoreList().includes(o));
            cb(null, {chatters});
          }
        } catch (e) {
          cb(e);
        }
      });
    });
  }
}

export default Chat;
export { Chat };
