import { getTime } from '../commons';
import { ui } from '../decorators';
import Overlay from './_interface';
import { publicEndpoint } from '../helpers/socket';
import api from '../api';

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
    publicEndpoint(this.nsp, 'get', async (cb) => {
      const stats = {
        uptime: getTime(api.isStreamOnline ? api.streamStatusChangeSince : 0, false),
        viewers: api.stats.currentViewers,
        followers: api.stats.currentFollowers,
        subscribers: api.stats.currentSubscribers,
        bits: api.stats.currentBits,
      };
      cb(stats);
    });
  }
}

export default new Stats();
