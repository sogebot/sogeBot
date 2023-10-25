import type { ClipsCarousel as CC } from '@entity/overlay.js';

import Overlay from './_interface.js';

import { publicEndpoint } from '~/helpers/socket.js';
import { getTopClips } from '~/services/twitch/calls/getTopClips.js';

class ClipsCarousel extends Overlay {
  sockets () {
    publicEndpoint(this.nsp, 'clips', async (data: NonNullable<CC>, cb) => {
      const clips = await getTopClips({
        period: 'custom', days: data.customPeriod, first: data.numOfClips,
      });
      cb(null, { clips });
    });
  }
}

export default new ClipsCarousel();
