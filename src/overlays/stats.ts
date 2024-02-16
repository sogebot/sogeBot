import Overlay from './_interface.js';

import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { getTime } from '~/helpers/getTime.js';
import { endpoint } from '~/helpers/socket.js';

class Stats extends Overlay {
  showInUI = false;

  sockets () {
    endpoint([], this.nsp, 'get' as any, async (cb: any) => {
      cb({
        uptime:      getTime(isStreamOnline.value ? streamStatusChangeSince.value : 0, false),
        viewers:     stats.value.currentViewers,
        followers:   stats.value.currentFollowers,
        subscribers: stats.value.currentSubscribers,
        bits:        stats.value.currentBits,
      });
    });
  }
}

export default new Stats();
