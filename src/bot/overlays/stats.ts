import { getTime } from '../commons';
import { ui } from '../decorators';
import Overlay from './_interface';

class Stats extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/stats',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/stats (500x55)',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  sockets () {
    global.panel.io.of('/overlays/stats').on('connection', (socket) => {
      socket.on('get', async (cb) => {
        const stats = {
          uptime: getTime(global.api.isStreamOnline ? global.api.streamStatusChangeSince : 0, false),
          viewers: global.api.stats.currentViewers,
          followers: global.api.stats.currentFollowers,
          subscribers: global.api.stats.currentSubscribers,
          bits: global.api.stats.currentBits,
        };
        cb(stats);
      });
    });
  }
}

export default Stats;
export { Stats };
