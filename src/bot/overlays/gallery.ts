import Overlay from './_interface';
import { v4 as uuid } from 'uuid';
import { isMainThread } from '../cluster';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Gallery as GalleryEntity } from '../database/entity/gallery';
import { app } from '../helpers/panel';
import { debug } from '../helpers/log';

class Gallery extends Overlay {
  showInUI = false;

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'gallery', id: 'registry.gallery/list', this: null });

    if (isMainThread) {
      const init = (retry = 0) => {
        if (retry === 10000) {
          throw new Error('Gallery endpoint failed.');
        } else if (!app) {
          setTimeout(() => init(retry++), 100);
        } else {
          debug('ui', 'Gallery endpoint OK.');
          app.get('/gallery/:id', async (req, res) => {
            const request = await getRepository(GalleryEntity).createQueryBuilder('gallery').select('sum(length(data))', 'size').where('id=:id', { id: req.params.id }).getRawOne();
            if (!request) {
              res.sendStatus(404);
              return;
            }
            if (req.headers['if-none-match'] === req.params.id + '-' + request.size) {
              res.sendStatus(304);
              return;
            }

            const file = await getRepository(GalleryEntity).findOne({ id: req.params.id });
            if (file) {
              const data = Buffer.from(file.data.split(',')[1], 'base64');
              res.writeHead(200, {
                'Content-Type': file.type,
                'Content-Length': data.length,
                'Cache-Control': 'public, max-age=31536000',
                'ETag': req.params.id + '-' + request.size,
              });
              res.end(data);
            }
          });
        }
      };
      init();
    }
  }

  sockets () {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const items = await getRepository(GalleryEntity).find({
          select: ['id', 'name', 'type'],
        });
        cb(null, items);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'generic::deleteById', async (id, cb) => {
      try {
        await getRepository(GalleryEntity).delete({ id: String(id) });
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'gallery::upload', async (data, cb) => {
      try {
        const filename = data[0];
        const filedata = data[1];
        const matches = filedata.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/);
        if (matches.length !== 3) {
          return false;
        }
        const type = matches[1];
        const item = await getRepository(GalleryEntity).save({ id: uuid(), type, data: filedata, name: filename });
        if (cb) {
          cb(null, { type, id: item.id, name: filename });
        }
      } catch (e) {
        if (cb) {
          cb(e.stack);
        }
      }
    });
  }
}

export default new Gallery();
