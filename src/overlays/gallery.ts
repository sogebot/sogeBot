import { fileURLToPath } from 'node:url';
import path, { dirname } from 'path';

import { Gallery as GalleryEntity } from '@entity/gallery.js';

import Overlay from './_interface.js';

import { AppDataSource } from '~/database.js';
import { debug } from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';
import { adminEndpoint } from '~/helpers/socket.js';

// __dirname is not available in ES6 module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
class Gallery extends Overlay {
  showInUI = false;

  constructor () {
    super();
    this.addMenu({
      category: 'registry', name: 'gallery', id: 'registry/gallery', this: null,
    });

    const init = (retry = 0) => {
      if (retry === 10000) {
        throw new Error('Gallery endpoint failed.');
      } else if (!app) {
        setTimeout(() => init(retry++), 100);
      } else {
        debug('ui', 'Gallery endpoint OK.');
        app.get('/gallery/:id', async (req, res) => {
          if (req.params.id === '_default_image') {
            res.sendFile(path.join(__dirname, '..', '..', 'assets', 'alerts', 'default.gif'));
            return;
          }
          if (req.params.id === '_default_audio') {
            res.sendFile(path.join(__dirname, '..', '..', 'assets', 'alerts', 'default.mp3'));
            return;
          }
          const request = await AppDataSource.getRepository(GalleryEntity).createQueryBuilder('gallery').select('sum(length(gallery.data))', 'size').where('id=:id', { id: req.params.id }).getRawOne();
          if (!request.size) {
            res.sendStatus(404);
            return;
          }
          if (req.headers['if-none-match'] === req.params.id + '-' + request.size) {
            res.sendStatus(304);
            return;
          }

          const file = await AppDataSource.getRepository(GalleryEntity).findOneBy({ id: req.params.id });
          if (file) {
            const data = Buffer.from(file.data.split(',')[1], 'base64');
            res.writeHead(200, {
              'Content-Type':   file.type,
              'Content-Length': data.length,
              'Cache-Control':  'public, max-age=31536000',
              'Accept-Ranges':  'bytes',
              'ETag':           req.params.id + '-' + request.size,
            });
            res.end(data);
          }
        });
      }
    };
    init();
  }

  sockets () {
    adminEndpoint('/overlays/gallery', 'generic::getOne', async (id, cb) => {
      try {
        const item = await AppDataSource.getRepository(GalleryEntity).findOne({
          where:  { id },
          select: ['id', 'name', 'type', 'folder'],
        });
        cb(null, item);
      } catch (e: any) {
        cb(e.stack, null);
      }
    });
    adminEndpoint('/overlays/gallery', 'generic::getAll', async (cb) => {
      try {
        const items = await AppDataSource.getRepository(GalleryEntity).find({ select: ['id', 'name', 'type', 'folder'] });
        cb(null, items);
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/overlays/gallery', 'generic::deleteById', async (id, cb) => {
      try {
        await AppDataSource.getRepository(GalleryEntity).delete({ id: String(id) });
        cb(null);
      } catch (e: any) {
        cb(e.stack);
      }
    });
    adminEndpoint('/overlays/gallery', 'generic::setById', async (opts, cb) => {
      try {
        cb(null, await AppDataSource.getRepository(GalleryEntity).save({
          ...(await AppDataSource.getRepository(GalleryEntity).findOneBy({ id: String(opts.id) })),
          ...opts.item,
        }));
        cb(null);
      } catch (e: any) {
        cb(e.stack);
      }
    });
    adminEndpoint('/overlays/gallery', 'gallery::upload', async (data, cb) => {
      try {
        const filename = data[0];
        const filedata = data[1] as { id: string, b64data: string, folder: string };
        const matches = filedata.b64data.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) {
          // update entity
          const item = await AppDataSource.getRepository(GalleryEntity).findOneByOrFail({ id: filedata.id });
          await AppDataSource.getRepository(GalleryEntity).save({
            id:     item.id,
            type:   item.type,
            data:   item.data + filedata.b64data,
            folder: filedata.folder,
            name:   item.name,
          });
        } else {
          // new entity
          const type = matches[1];
          await AppDataSource.getRepository(GalleryEntity).save({
            id: filedata.id, type, data: filedata.b64data, name: filename, folder: filedata.folder,
          });
        }
        if (cb) {
          cb(null);
        }
      } catch (e: any) {
        if (cb) {
          cb(e.stack);
        }
      }
    });
  }
}

export default new Gallery();
