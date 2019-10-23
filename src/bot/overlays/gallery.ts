import Overlay from './_interface';
import uuid from 'uuid/v4';
import { isMainThread } from 'worker_threads';
import { isEmpty } from 'lodash';
import { adminEndpoint } from '../helpers/socket';

class Gallery extends Overlay {
  showInUI = false;

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'gallery', id: 'registry.gallery/list' });

    if (isMainThread) {
      global.db.engine.index(this.collection.data, { index: 'id', unique: true });
      global.panel.getApp().get('/gallery/:id', async (req, res) => {
        const file = await global.db.engine.findOne(this.collection.data, { id: req.params.id });
        if (!isEmpty(file)) {
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
    adminEndpoint(this.nsp, 'upload', async (data, cb) => {
      const filename = data[0];
      const filedata = data[1];
      const matches = filedata.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/);
      if (matches.length !== 3) {
        return false;
      }
      const type = matches[1];
      const item = await global.db.engine.insert(this.collection.data, { id: uuid(), type, data: filedata, name: filename });
      cb({ type, id: item.id, name: filename });
    });
  }
}

export default Gallery;
export { Gallery };
