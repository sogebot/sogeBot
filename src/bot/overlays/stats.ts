import { get } from 'lodash';

import { getTime } from '../commons';
import { ui } from '../decorators';
import Overlay from './_interface';

class Stats extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/stats',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/stats (500x55)',
    target: '_blank'
  }, 'links')
  linkBtn: null = null;

  sockets () {
    global.panel.io.of('/overlays/stats').on('connection', (socket) => {
      socket.on('get', async (cb) => {
        const when = await global.cache.when();
        const stats = {
          uptime: getTime(await global.cache.isOnline() ? when.online : 0, false),
          viewers: get(await global.db.engine.findOne('api.current', { key: 'viewers' }), 'value', 0),
          followers: get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
          subscribers: get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
          bits: get(await global.db.engine.findOne('api.current', { key: 'tips' }), 'value', 0)
        };
        cb(stats);
      });
    });
  }
}

export default Stats;
export { Stats };
