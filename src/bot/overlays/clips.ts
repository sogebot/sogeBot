import Overlay from './_interface';
import { settings, ui } from '../decorators';
import api from '../api';
import { ioServer } from '../helpers/panel';

class Clips extends Overlay {
  @settings('customization')
  @ui({ type: 'number-input', step: '1', min: '0', max: '100' })
  cClipsVolume = 0;
  @settings('customization')
  @ui({ type: 'selector', values: ['none', 'grayscale', 'sepia', 'tint', 'washed'] })
  cClipsFilter: 'none' | 'grayscale' | 'sepia' | 'tint' | 'washed' = 'none';
  @settings('customization')
  cClipsLabel = true;

  async showClip (clipId: string) {
    const clips = (await api.getClipById(clipId)).data || [];
    for (const c of clips) {
      c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
    }

    ioServer?.of('/' + this._name + '/' + this.__moduleName__.toLowerCase())
      .emit('clips', {
        clips,
        settings: {
          volume: this.cClipsVolume,
          filter: this.cClipsFilter,
          label: this.cClipsLabel,
        },
      });
  }
}

export default new Clips();
