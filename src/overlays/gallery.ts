import { fileURLToPath } from 'node:url';
import path, { dirname } from 'path';

import { Gallery as GalleryEntity } from '@entity/gallery.js';
import { Request } from 'express';

import Overlay from './_interface.js';

import { AppDataSource } from '~/database.js';
import { Delete, Get, Post } from '~/decorators/endpoint.js';
import { debug } from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';

// __dirname is not available in ES6 module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
class Gallery extends Overlay {
  showInUI = false;

  constructor () {
    super();
    this.addMenu({
      category: 'registry', name: 'gallery', id: 'registry/gallery', this: null, scopeParent: this.scope(),
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

  @Get('/')
  async getAll () {
    return AppDataSource.getRepository(GalleryEntity).find({ select: ['id', 'name', 'type', 'folder'] });
  }

  @Delete('/:id')
  async delete (req: Request) {
    return AppDataSource.getRepository(GalleryEntity).delete({ id: req.params.id });
  }

  @Post('/')
  async upload (req: Request) {
    const { id, b64data, folder, name } = req.body;
    const matches = b64data.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/);
    if (!matches) {
      // update entity
      const item = await AppDataSource.getRepository(GalleryEntity).findOneByOrFail({ id });
      await AppDataSource.getRepository(GalleryEntity).save({
        id:     item.id,
        type:   item.type,
        data:   item.data + b64data,
        folder: folder,
        name:   item.name,
      });
    } else {
      // new entity
      const type = matches[1];
      await AppDataSource.getRepository(GalleryEntity).save({
        id, type, data: b64data, name: name, folder,
      });
    }
  }
}

export default new Gallery();
