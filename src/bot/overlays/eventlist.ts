import * as _ from 'lodash';
import crypto from 'crypto';

import Overlay from './_interface';
import { isBot } from '../commons';
import { ui } from '../decorators';

class EventList extends Overlay {
  socket: any = null;

  @ui({
    type: 'link',
    href: '/overlays/eventlist',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/eventlist (350x220)',
    target: '_blank',
  }, 'links')
  linkBtn: null = null;

  sockets () {
    global.panel.io.of('/overlays/eventlist').on('connection', (socket) => {
      this.socket = socket;
      socket.on('get', () => this.sendDataToOverlay());
    });
  }

  async sendDataToOverlay () {
    if (!this.socket) {return setTimeout(() => this.sendDataToOverlay(), 1000);}

    let events = await global.db.engine.find('widgetsEventList');
    events = _.uniqBy(_.orderBy(events, 'timestamp', 'desc'), o =>
      (o.username + (o.event === 'cheer' ? crypto.randomBytes(64).toString('hex') : o.event))
    );
    this.socket.emit('events', _.chunk(events, 20)[0]);
  }

  async add (data: EventList.Event) {
    if (isBot(data.username)) {return;} // don't save event from a bot

    const newEvent = {
      event: data.type,
      timestamp: _.now(),
      ...data
    };
    await global.db.engine.insert('widgetsEventList', newEvent);
    global.overlays.eventlist.sendDataToOverlay();
    global.widgets.eventlist.update();
  }
}

export default EventList;
export { EventList };