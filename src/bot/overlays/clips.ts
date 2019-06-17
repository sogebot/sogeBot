import Overlay from './_interface';
import { ui, settings } from '../decorators';

class Clips extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/clips',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/clips (640x360)',
    target: '_blank'
  }, 'links')
  linkBtn: null = null;

  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '0', max: '100' })
  cClipsVolume: number = 0;
  @settings('clips')
  @ui({ type: 'selector', values: ['none', 'grayscale', 'sepia', 'tint', 'washed'] })
  cClipsFilter: 'none' | 'grayscale' | 'sepia' | 'tint' | 'washed' = 'none';
  @settings('clips')
  cClipsLabel: boolean = true;

  async showClip (clipId: string) {
    let clips = (await global.api.getClipById(clipId)).data || [];
    for (let c of clips) {
      c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
    }

    global.panel.io
      .of('/' + this._name + '/' + this.constructor.name.toLowerCase())
      .emit('clips', {
        clips,
        settings: {
          volume: this.cClipsVolume,
          filter: this.cClipsFilter,
          label: this.cClipsLabel
        }
      });
  }
}

export default Clips;
export { Clips };
