import * as _ from 'lodash';
import crypto from 'crypto';

import Overlay from './_interface';
import { isBot } from '../commons';
import { ui } from '../decorators';
import { isMainThread } from 'worker_threads';
import { publicEndpoint } from '../helpers/socket';

class EventList extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/eventlist',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/eventlist (350x220)',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  constructor() {
    super();
    if (isMainThread) {
      global.db.engine.index('widgetsEventList', { index: 'timestamp' });
    }
  }

  sockets () {
    publicEndpoint(this.nsp, 'get', () => this.sendDataToOverlay());
  }

  async sendDataToOverlay () {
    let events = await global.db.engine.find('widgetsEventList');
    events = _.uniqBy(_.orderBy(events, 'timestamp', 'desc'), o =>
      (o.username + (o.event === 'cheer' ? crypto.randomBytes(64).toString('hex') : o.event))
    );
    this.emit('events', _.chunk(events, 20)[0]);
  }

  async add (data: EventList.Event) {
    if (isBot(data.username)) {
      return;
    } // don't save event from a bot

    const newEvent = {
      event: data.type,
      timestamp: _.now(),
      ...data,
    };
    await global.db.engine.insert('widgetsEventList', newEvent);
    global.overlays.eventlist.sendDataToOverlay();
    global.widgets.eventlist.update();
  }
}

export default EventList;
export { EventList };