import * as _ from 'lodash';

import Overlay from './_interface';
import { ui } from '../decorators';
import uuid from 'uuid/v4';

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
    global.panel.io.of('/overlays/carousel').on('connection', (socket) => {
      socket.on('delete.image', async (id, cb) => {
        await global.db.engine.remove('overlays.carousel', { id });
        // force reorder
        const images = _.orderBy(await global.db.engine.find('overlays.carousel'), 'order', 'asc');
        for (let order = 0; order < images.length; order++) {
          await global.db.engine.update('overlays.carousel', { id: images[order].id }, { order });
        }
        cb();
      });

      socket.on('upload', async (data, cb) => {
        const matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches.length !== 3) {
          return false;
        }

        const type = matches[1];
        const base64 = matches[2];

        const order = (await global.db.engine.find('overlays.carousel')).length;
        const image = await global.db.engine.insert('overlays.carousel',
          {
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
    });
  }
}

export default Carousel;
export { Carousel };
