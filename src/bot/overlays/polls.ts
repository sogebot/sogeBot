import Overlay from './_interface';
import { settings, ui } from '../decorators';
import { publicEndpoint } from '../helpers/socket';

class Polls extends Overlay {
  @settings('display')
  @ui({ type: 'selector', values: ['light', 'dark', 'Soge\'s green']  })
  cDisplayTheme: 'light' | 'dark' | 'Soge\'s green' = 'light';
  @settings('display')
  cDisplayHideAfterInactivity = true;
  @settings('display')
  @ui({ type: 'number-input', min: 0 })
  cDisplayInactivityTime = 5000;
  @settings('display')
  @ui({ type: 'selector', values: ['top', 'bottom'] })
  cDisplayAlign: 'top' | 'bottom' = 'top';

  @ui({
    type: 'link',
    href: '/overlays/polls',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/polls',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  public sockets() {
    publicEndpoint(this.nsp, 'getVoteCommand', async (cb) => {
      cb(this.getCommand['!vote']);
    });
    publicEndpoint(this.nsp, 'data', async (callback) => {
      const currentVote: Poll = await global.db.engine.findOne(global.systems.polls.collection.data, { isOpened: true });
      const votes: Vote[] = await global.db.engine.find(global.systems.polls.collection.votes, { vid: String(currentVote._id) });
      const settings = {
        display: {
          align: this.cDisplayAlign,
          theme: this.cDisplayTheme,
          hideAfterInactivity: this.cDisplayHideAfterInactivity,
          inactivityTime: this.cDisplayInactivityTime,
        },
      };
      callback(currentVote, votes, settings);
    });
  }
}

export default Polls;
export { Polls };
