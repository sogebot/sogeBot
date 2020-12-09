import api from '../api';
import { getTime } from '../helpers/getTime';
import { publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

class Stats extends Overlay {
  showInUI = false;

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
