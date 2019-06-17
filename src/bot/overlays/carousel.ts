import * as _ from 'lodash';

import Overlay from './_interface';
import { ui } from '../decorators';

class Carousel extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/carousel',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/carousel',
    target: '_blank',
  }, 'links')
  linkBtn: null = null;

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'carouseloverlay', id: 'registry.carouselOverlay/list' });
  }

  sockets () {
    global.panel.io.of('/overlays/carousel').on('connection', (socket) => {
      socket.on('load', async (cb) => {
        let images = (await global.db.engine.find('overlays.carousel')).map((o) => { o._id = o._id.toString(); return o; });
        cb(_.orderBy(images, 'order', 'asc'));
      });

      socket.on('delete.image', async (id, cb) => {
        await global.db.engine.remove('overlays.carousel', { _id: id });
        // force reorder
        let images = _.orderBy((await global.db.engine.find('overlays.carousel')).map((o) => { o._id = o._id.toString(); return o; }), 'order', 'asc');
        for (let order = 0; order < images.length; order++) {await global.db.engine.update('overlays.carousel', { _id: images[order]._id }, { order });}
        cb();
      });

      socket.on('move', async (go, id, cb) => {
        let images = (await global.db.engine.find('overlays.carousel')).map((o) => { o._id = o._id.toString(); return o; });

        let image = _.find(images, (o) => o._id === id);
        let upImage = _.find(images, (o) => Number(o.order) === Number(image.order) - 1);
        let downImage = _.find(images, (o) => Number(o.order) === Number(image.order) + 1);

        switch (go) {
          case 'up':
            if (!_.isNil(upImage)) {
              await global.db.engine.update('overlays.carousel', { _id: image._id }, { order: Number(upImage.order) });
              await global.db.engine.update('overlays.carousel', { _id: upImage._id }, { order: Number(image.order) });
            }
            cb([
              { imageId: id, order: Number(upImage.order) },
              { imageId: String(upImage._id), order: Number(image.order) }
            ]);
            break;
          case 'down':
            if (!_.isNil(downImage)) {
              await global.db.engine.update('overlays.carousel', { _id: image._id }, { order: Number(downImage.order) });
              await global.db.engine.update('overlays.carousel', { _id: downImage._id }, { order: Number(image.order) });
            }
            cb([
              { imageId: id, order: Number(downImage.order) },
              { imageId: String(downImage._id), order: Number(image.order) }
            ]);
            break;
        }
      });

      socket.on('upload', async (data, cb) => {
        var matches = data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches.length !== 3) { return false; }

        var type = matches[1];
        var base64 = matches[2];

        let order = (await global.db.engine.find('overlays.carousel')).length;
        let image = await global.db.engine.insert('overlays.carousel',
          { type,
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
            showOnlyOncePerStream: false
          });
        cb(image);
      });
    });
  }
}

export default Carousel;
export { Carousel };
