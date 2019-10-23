import Overlay from './_interface';
import { settings, ui } from '../decorators';
import { publicEndpoint } from '../helpers/socket';

class ClipsCarousel extends Overlay {
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cClipsCustomPeriodInDays = 31;
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cClipsNumOfClips = 20;
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '1' })
  cClipsTimeToNextClip = 45;

  @ui({
    type: 'link',
    href: '/overlays/clipscarousel',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/clipscarousel (1920x1080)',
    target: '_blank',
  }, 'links')
  btnLink = null;

  sockets () {
    publicEndpoint(this.nsp, 'clips', async (cb) => {
      const clips = await global.api.getTopClips({ period: 'custom', days: this.cClipsCustomPeriodInDays, first: this.cClipsNumOfClips });
      cb(null, { clips, settings: { timeToNextClip: this.cClipsTimeToNextClip } });
    });
  }
}

export default ClipsCarousel;
export { ClipsCarousel };
