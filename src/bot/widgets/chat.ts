'use strict';

import axios from 'axios';

import Widget from './_interface';
import { sendMessage, getIgnoreList } from '../commons';

class Chat extends Widget {
  constructor() {
    super({});
    this.addWidget('chat', 'widget-title-chat', 'far fa-comments');
  }

  public sockets() {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
    this.socket.on('connection', (socket) => {
      socket.on('chat.message.send', (message) => {
        sendMessage(message, { username: global.oauth.settings.bot.username }, { force: true });
      });

      socket.on('room', (cb) => {
        cb(null, global.oauth.settings.general.channel.toLowerCase());
      });

      socket.on('viewers', async (cb) => {
        try {
          const url = `https://tmi.twitch.tv/group/user/${(await global.oauth.settings.general.channel).toLowerCase()}/chatters`;
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

module.exports = new Chat();
