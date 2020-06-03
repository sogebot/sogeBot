import Overlay from './_interface';
import { ui } from '../decorators';
import { v4 as uuid } from 'uuid';
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
    this.addMenu({ category: 'registry', name: 'carouseloverlay', id: 'registry.carousel/list', this: null });
  }

  sockets () {
    publicEndpoint(this.nsp, 'generic::getOne', async (id: string, cb) => {
      try {
        cb(null, await getRepository(CarouselEntity).findOne({ id }));
      } catch (e) {
        cb(e.stack);
      }
    });
    publicEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        cb(null, await getRepository(CarouselEntity).find({
          order: {
            order: 'ASC',
          },
        }));
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'carousel::save', async (items, cb) => {
      try {
        cb(null, await getRepository(CarouselEntity).save(items));
      } catch (e) {
        cb(e.stack, []);
      }
    });

    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      try {
        await getRepository(CarouselEntity).delete({ id: String(id) });
        // force reorder
        const images = await getRepository(CarouselEntity).find({
          order: {
            order: 'ASC',
          },
        });
        await getRepository(CarouselEntity).save(images.map((image, index) => {
          return {
            ...image,
            order: index,
          };
        }));
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });

    adminEndpoint(this.nsp, 'carousel::insert', async (data, cb) => {
      try {
        const matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
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
        cb(null, image);
      } catch (e) {
        cb(e.stack);
      }
    });
  }
}

export default new Carousel();
