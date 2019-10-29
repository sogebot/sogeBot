import { isMainThread } from 'worker_threads';

import { sendMessage } from '../commons';
import { command, settings, ui } from '../decorators';
import Game from './_interface';
import { publicEndpoint } from '../helpers/socket';

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

  constructor() {
    super();
    if(isMainThread) {
      global.db.engine.index(this.collection.data, [{ index: 'key', unique: true }]);
    }
  }

  sockets () {
    publicEndpoint(this.nsp, 'win', async (index, username) => {
      // compensate for slight delay
      setTimeout(async () => {
        const userObj = await global.users.getByName(username);
        for (const response of this.data[index].responses) {
          if (response.trim().length > 0) {
            sendMessage(response, {
              username: userObj.username,
              displayName: userObj.displayName || userObj.username,
              userId: userObj.id,
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
