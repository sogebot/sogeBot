import { getTime } from '@sogebot/ui-helpers/getTime.js';

import Overlay from './_interface.js';

import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { publicEndpoint } from '~/helpers/socket.js';

class Stats extends Overlay {
  showInUI = false;

  sockets () {
    publicEndpoint(this.nsp, 'get', async (cb) => {
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
