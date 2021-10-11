import { Carousel as CarouselRepository } from '@entity/carousel';
import { getRepository } from 'typeorm';

import { onStartup } from '../decorators/on';
import { getApp } from '../panel';
import Overlay from './_interface';

class Carousel extends Overlay {
  showInUI = false;

  @onStartup()
  onStartup() {
    this.addMenu({
      category: 'registry', name: 'carouseloverlay', id: 'registry.carousel', this: null,
    });

    getApp()?.get('/api/v1/carousel/image/:id', async (req, res) => {
      try {
        const file = await getRepository(CarouselRepository).findOneOrFail({ id: req.params.id });
        const data = Buffer.from(file.base64, 'base64');
        res.writeHead(200, {
          'Content-Type':   file.type,
          'Content-Length': data.length,
          'Cache-Control':  'public, max-age=31536000',
          'ETag':           req.params.id,
        });
        res.end(data);
      } catch (e: any) {
        res.sendStatus(404);
      }
      return;
    });
  }
}

export default new Carousel();
