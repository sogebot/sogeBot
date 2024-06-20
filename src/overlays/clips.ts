import { Request } from 'express';
import { z } from 'zod';

import Overlay from './_interface.js';

import { Post } from '~/decorators/endpoint.js';
import { ioServer } from '~/helpers/panel.js';
import twitch from '~/services/twitch.js';

class Clips extends Overlay {
  @Post('/', { action: 'test', zodValidator: z.object({ clipId: z.string() }) })
  test(req: Request) {
    return this.showClip(req.body.clipId);
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
