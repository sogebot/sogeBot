import api from '../api';
import type { OverlayMapperClipsCarousel } from '../database/entity/overlay';
import { publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

class ClipsCarousel extends Overlay {
  sockets () {
    publicEndpoint(this.nsp, 'clips', async (data: NonNullable<OverlayMapperClipsCarousel['opts']>, cb) => {
      const clips = await api.getTopClips({
        period: 'custom', days: data.customPeriod, first: data.numOfClips,
      });
      cb(null, { clips });
    });
  }
}

export default new ClipsCarousel();
