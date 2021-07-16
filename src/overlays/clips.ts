import api from '../api';
import { ioServer } from '../helpers/panel';
import Overlay from './_interface';

class Clips extends Overlay {
  async showClip (clipId: string) {
    const clips = (await api.getClipById(clipId)).data || [];
    for (const c of clips) {
      c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
    }

    ioServer?.of('/' + this._name + '/' + this.__moduleName__.toLowerCase())
      .emit('clips', { clips });
  }
}

export default new Clips();
