import { isStreamOnline, stats, streamStatusChangeSince } from '../helpers/api';
import { getTime } from '../helpers/getTime';
import { publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

class Stats extends Overlay {
  showInUI = false;

  sockets () {
    publicEndpoint(this.nsp, 'get', async (cb) => {
      cb({
        uptime: getTime(isStreamOnline ? streamStatusChangeSince : 0, false),
        viewers: stats.currentViewers,
        followers: stats.currentFollowers,
        subscribers: stats.currentSubscribers,
        bits: stats.currentBits,
      });
    });
  }
}

export default new Stats();
