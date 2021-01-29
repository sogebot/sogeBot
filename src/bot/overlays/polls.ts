import { getRepository } from 'typeorm';

import { Poll } from '../database/entity/poll';
import { settings, ui } from '../decorators';
import { publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

class Polls extends Overlay {
  @settings('customization')
  @ui({ type: 'selector', values: ['light', 'dark', 'Soge\'s green']  })
  cDisplayTheme: 'light' | 'dark' | 'Soge\'s green' = 'light';
  @settings('customization')
  cDisplayHideAfterInactivity = true;
  @settings('customization')
  @ui({ type: 'number-input', min: 0 })
  cDisplayInactivityTime = 5000;
  @settings('customization')
  @ui({ type: 'selector', values: ['top', 'bottom'] })
  cDisplayAlign: 'top' | 'bottom' = 'top';

  public sockets() {
    publicEndpoint(this.nsp, 'getVoteCommand', async (cb) => {
      cb(this.getCommand('!vote'));
    });
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const currentVote = await getRepository(Poll).findOne({
        relations: ['votes'],
        where:     { isOpened: true },
      });
      callback(currentVote, currentVote?.votes, {
        display: {
          align:               this.cDisplayAlign,
          theme:               this.cDisplayTheme,
          hideAfterInactivity: this.cDisplayHideAfterInactivity,
          inactivityTime:      this.cDisplayInactivityTime,
        },
      });
    });
  }
}

export default new Polls();
