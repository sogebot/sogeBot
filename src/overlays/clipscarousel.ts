import type { OverlayMapperClipsCarousel } from '@entity/overlay';

import Overlay from './_interface';

import { publicEndpoint } from '~/helpers/socket';
import { getTopClips } from '~/services/twitch/calls/getTopClips';

class ClipsCarousel extends Overlay {
  sockets () {
    publicEndpoint(this.nsp, 'clips', async (data: NonNullable<OverlayMapperClipsCarousel['opts']>, cb) => {
      const clips = await getTopClips({
        period: 'custom', days: data.customPeriod, first: data.numOfClips,
      });
      cb(null, { clips });
    });
  }
}

export default new ClipsCarousel();
