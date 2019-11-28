import Overlay from './_interface';
import { ui } from '../decorators';
import uuid from 'uuid/v4';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Carousel as CarouselEntity } from '../database/entity/carousel';

class Carousel extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/carousel',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/carousel',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'carouseloverlay', id: 'registry.carousel/list' });
  }

  sockets () {
    publicEndpoint(this.nsp, 'carousel::getOne', async (id: string, cb) => {
      cb(await getRepository(CarouselEntity).findOne({ id }));
    });
    publicEndpoint(this.nsp, 'carousel::getAll', async (cb) => {
      cb(await getRepository(CarouselEntity).find({
        order: {
          order: 'ASC',
        },
      }));
    });
    adminEndpoint(this.nsp, 'carousel::save', async (items: CarouselEntity[], cb) => {
      cb(await getRepository(CarouselEntity).save(items));
    });

    adminEndpoint(this.nsp, 'carousel::remove', async (id, cb) => {
      await getRepository(CarouselEntity).delete({ id });
      // force reorder
      const images = await getRepository(CarouselEntity).find({
        order: {
          order: 'ASC',
        },
      });
      for (let order = 0; order < images.length; order++) {
        images[order].order = 0;
      }
      await getRepository(CarouselEntity).save(images);
      cb();
    });

    adminEndpoint(this.nsp, 'carousel::insert', async (data, cb) => {
      const matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches.length !== 3) {
        return false;
      }

      const type = matches[1];
      const base64 = matches[2];

      const order = await getRepository(CarouselEntity).count();
      const image = await getRepository(CarouselEntity).save({
        id: uuid(),
        type,
        base64,
        // timers in ms
        waitBefore: 0,
        waitAfter: 0,
        duration: 5000,
        // animation
        animationInDuration: 1000,
        animationIn: 'fadeIn',
        animationOutDuration: 1000,
        animationOut: 'fadeOut',
        // order
        order,
        // showOnlyOncePerStream
        showOnlyOncePerStream: false,
      });
      cb(image);
    });
  }
}

export default new Carousel();
