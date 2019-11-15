import Overlay from './_interface';
import uuid from 'uuid/v4';
import { isMainThread } from '../cluster';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Gallery as GalleryEntity } from '../database/entity/gallery';

class Gallery extends Overlay {
  showInUI = false;

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'gallery', id: 'registry.gallery/list' });

    if (isMainThread) {
      global.panel.getApp().get('/gallery/:id', async (req, res) => {
        const file = await getRepository(GalleryEntity).findOne({ id: req.params.id });
        if (file) {
          const data = Buffer.from(file.data.split(',')[1], 'base64');
          res.writeHead(200, {
            'Content-Type': file.type,
            'Content-Length': data.length,
          }),
          res.end(data);
        } else {
          res.sendStatus(404);
        }
      });
    }
  }

  sockets () {
    adminEndpoint(this.nsp, 'gallery::getAll', async (cb) => {
      try {
        const items = await getRepository(GalleryEntity).find({
          select: ['id', 'name', 'type'],
        });
        cb(null, items);
      } catch (e) {
        cb(e, []);
      }
    });
    adminEndpoint(this.nsp, 'gallery::delete', async (id: string, cb) => {
      try {
        await getRepository(GalleryEntity).delete({ id });
        cb(null);
      } catch (e) {
        cb(e);
      }
    });
    adminEndpoint(this.nsp, 'gallery::upload', async (data, cb) => {
      const filename = data[0];
      const filedata = data[1];
      const matches = filedata.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/);
      if (matches.length !== 3) {
        return false;
      }
      const type = matches[1];
      const item = await getRepository(GalleryEntity).save({ id: uuid(), type, data: filedata, name: filename });
      cb({ type, id: item.id, name: filename });
    });
  }
}

export default Gallery;
export { Gallery };
