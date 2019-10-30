import Registry from './_interface';
import { isMainThread } from '../cluster';
import { generateUsername } from '../helpers/generateUsername';
import { getLocalizedName } from '../commons';
import { publicEndpoint } from '../helpers/socket';

class Alerts extends Registry {
  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'alerts', id: 'registry/alerts/list' });
    if (isMainThread) {
      global.panel.getApp().get('/registry/alerts/:mediaid', async (req, res) => {
        const media: Registry.Alerts.AlertMedia[] = await global.db.engine.find(this.collection.media, { id: req.params.mediaid });
        const b64data = media.sort((a,b) => a.chunkNo - b.chunkNo).map(o => o.b64data).join('');
        if (b64data.trim().length === 0) {
          res.send(404);
        } else {
          const match = (b64data.match(/^data:\w+\/\w+;base64,/) || [ 'data:image/gif;base64,' ])[0];
          const data = Buffer.from(b64data.replace(/^data:\w+\/\w+;base64,/, ''), 'base64');
          res.writeHead(200, {
            'Content-Type': match.replace('data:', '').replace(';base64,', ''),
            'Content-Length': data.length,
          });
          res.end(data);
        }
      });
    }
  }

  sockets () {
    publicEndpoint(this.nsp, 'isAlertUpdated', async ({updatedAt, id}: { updatedAt: number; id: string }, cb: (isUpdated: boolean, updatedAt: number) => void) => {
      const alert = await global.db.engine.findOne(this.collection.data, { id });
      if (typeof alert.id !== 'undefined') {
        cb(updatedAt < (alert.updatedAt || 0), alert.updatedAt || 0);
      } else {
        cb(false, 0);
      }
    });
    publicEndpoint(this.nsp, 'clear-media', async () => {
      const alerts: Registry.Alerts.Alert[] = await global.db.engine.find(this.collection.data);
      const mediaIds: string[] = [];
      for (const alert of alerts) {
        for (const event of Object.keys(alert.alerts)) {
          alert.alerts[event].map(o => {
            mediaIds.push(o.imageId);
            mediaIds.push(o.soundId);
          });
        }
      }
      await global.db.engine.remove(this.collection.media, { id: { $nin: mediaIds } });
    });
    publicEndpoint(this.nsp, 'test', async (event: keyof Registry.Alerts.List) => {
      this.test({ event });
    });
  }

  trigger(opts: Registry.Alerts.EmitData) {
    global.panel.io.of('/registries/alerts').emit('alert', opts);
  }

  test(opts: { event: keyof Registry.Alerts.List }) {
    const amount = Math.floor(Math.random() * 1000);
    const messages = [
      'Lorem ipsum dolor sit amet, https://www.google.com',
      /* 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Etiam dictum tincidunt diam. Aliquam erat volutpat. Mauris tincidunt sem sed arcu. Etiam sapien elit, consequat eget, tristique non, venenatis quis, ante. Praesent id justo in neque elementum ultrices. Integer pellentesque quam vel velit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Etiam commodo dui eget wisi. Cras pede libero, dapibus nec, pretium sit amet, tempor quis. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.',
      'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.',
      'This is some testing message :)',
      'Lorem ipsum dolor sit amet',
      '',*/
    ];
    const data: Registry.Alerts.EmitData = {
      name: generateUsername(),
      amount,
      currency: global.currency.mainCurrency,
      monthsName: getLocalizedName(amount, 'core.months'),
      event: opts.event,
      autohost: true,
      message: ['tips', 'cheers'].includes(opts.event)
        ? messages[Math.floor(Math.random() * messages.length)]
        : '',
    };

    this.trigger(data);
  }
}

export default Alerts;
export { Alerts };
