import api from '../api';
import { settings, ui } from '../decorators';
import { publicEndpoint } from '../helpers/socket';
import Overlay from './_interface';

class ClipsCarousel extends Overlay {
  @settings('customization')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cClipsCustomPeriodInDays = 31;
  @settings('customization')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cClipsNumOfClips = 20;
  @settings('customization')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cClipsTimeToNextClip = 45;

  sockets () {
    publicEndpoint(this.nsp, 'clips', async (cb) => {
      const clips = await api.getTopClips({ period: 'custom', days: this.cClipsCustomPeriodInDays, first: this.cClipsNumOfClips });
      cb(null, { clips, settings: { timeToNextClip: this.cClipsTimeToNextClip } });
    });
  }
}

export default new ClipsCarousel();
