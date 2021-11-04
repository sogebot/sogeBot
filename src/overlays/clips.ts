import client from '../services/twitch/api/client';
import Overlay from './_interface';

import { ioServer } from '~/helpers/panel';

class Clips extends Overlay {
  async showClip (clipId: string) {
    const clientBot = await client('bot');
    const getClipById = await clientBot.clips.getClipById(clipId);

    if (getClipById) {
      ioServer?.of('/' + this._name + '/' + this.__moduleName__.toLowerCase())
        .emit('clips', { clips: [
          { ...getClipById, mp4: getClipById.thumbnailUrl.replace('-preview-480x272.jpg', '.mp4') },
        ] });
    }
  }
}

export default new Clips();
