import Overlay from './_interface.js';

import { endpoint } from '~/helpers/socket.js';
import { getTopClips } from '~/services/twitch/calls/getTopClips.js';

class ClipsCarousel extends Overlay {
  sockets () {
    endpoint([], this.nsp, 'clips' as any, async (data: any, cb: any) => {
      const clips = await getTopClips({
        period: 'custom', days: data.customPeriod, first: data.numOfClips,
      });
      cb(null, { clips });
    });
  }
}

export default new ClipsCarousel();
