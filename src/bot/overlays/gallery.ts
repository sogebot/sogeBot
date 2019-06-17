import Overlay from './_interface';

class Gallery extends Overlay {
  showInUI: boolean = false;

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'gallery', id: 'registry.gallery/list' });
  }

  sockets () {
    global.panel.io.of('/overlays/gallery').on('connection', (socket) => {
      socket.on('upload', async (data, cb) => {
        const filename = data[0];
        const filedata = data[1];
        var matches = filedata.match(/^data:([0-9A-Za-z-+/]+);base64,(.+)$/);
        if (matches.length !== 3) { return false; }
        const type = matches[1];
        const item = await global.db.engine.insert(this.collection.data, { type, data: filedata, name: filename });
        cb({ type, _id: String(item._id), name: filename });
      });
    });
  }
}

export default Gallery;
export { Gallery };
