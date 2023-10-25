import Overlay from './_interface.js';

import { ioServer } from '~/helpers/panel.js';
import { adminEndpoint } from '~/helpers/socket.js';
import twitch from '~/services/twitch.js';

class Clips extends Overlay {
  sockets() {
    adminEndpoint('/overlays/clips', 'test', clipURL => {
      this.showClip(clipURL);
    });
  }

  async showClip (clipId: string) {
    const getClipById = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.clips.getClipById(clipId));

    if (getClipById) {
      ioServer?.of('/' + this._name + '/' + this.__moduleName__.toLowerCase())
        .emit('clips', { clips: [
          { ...getClipById, mp4: getClipById.thumbnailUrl.replace('-preview-480x272.jpg', '.mp4') },
        ] });
    }
  }
}

export default new Clips();
