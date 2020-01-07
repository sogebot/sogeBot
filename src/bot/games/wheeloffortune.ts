import { sendMessage } from '../commons';
import { command, settings, ui } from '../decorators';
import Game from './_interface';
import { publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import api from '../api';
import panel from '../panel';

const processWinEndpoint = async (index: number, username: string) => {
  const user = await getRepository(User).findOne({ username });
  if (!user) {
    await getRepository(User).save({
      userId: Number(await api.getIdFromTwitch(username)),
      username,
    });
    return processWinEndpoint(index, username);
  }

  for (const response of _self.data[index].responses) {
    if (response.trim().length > 0) {
      sendMessage(response, {
        username: user.username,
        displayName: user.displayname || user.username,
        userId: user.userId,
        emotes: [],
        badges: {},
        'message-type': 'chat',
      });
    }
  }
};

class WheelOfFortune extends Game {
  @ui({
    type: 'link',
    href: '/overlays/wheeloffortune',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/wheeloffortune (500x55)',
    target: '_blank',
  }, 'links')
  btnLink = null;

  @settings('options')
  @ui({ type: 'wof-responses' }, 'options')
  data: {
    title: string;
    responses: string[];
  }[] = [];

  sockets () {
    publicEndpoint(this.nsp, 'win', async (index, username) => {
      // compensate for slight delay
      setTimeout(processWinEndpoint(index, username), 2000);
    });
  }

  @command('!wof')
  async main (opts) {
    panel.io.of('/games/wheeloffortune').emit('spin', { options: this.data, username: opts.sender.username });
  }
}


const _self = new WheelOfFortune();
export default _self;
export { WheelOfFortune };