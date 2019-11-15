import { sendMessage } from '../commons';
import { command, settings, ui } from '../decorators';
import Game from './_interface';
import { publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';

class WheelOfFortune extends Game {
  @ui({
    type: 'link',
    href: '/overlays/wheeloffortune',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/wheeloffortune (500x55)',
    target: '_blank',
  })
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
      setTimeout(async () => {
        let user = await getRepository(User).findOne({ username });

        if (!user) {
          user = new User();
          user.userId = Number(await global.api.getIdFromTwitch(username));
          user.username = username;
          await getRepository(User).save(user);
        }
        for (const response of this.data[index].responses) {
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
      }, 2000);
    });
  }

  @command('!wof')
  async main (opts) {
    global.panel.io.of('/games/wheeloffortune').emit('spin', { options: this.data, username: opts.sender.username });
  }
}

export default WheelOfFortune;
export { WheelOfFortune };
