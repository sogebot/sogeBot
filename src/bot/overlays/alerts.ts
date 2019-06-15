import { isNil } from 'lodash';
import { isMainThread } from 'worker_threads';

import { command, default_permission, ui } from '../decorators';
import Message from '../message';
import { permission } from '../permissions';
import Overlay from './_interface';

class Alerts extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/alerts',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/alerts',
    target: '_blank',
  }, 'links')
  linkBtn: null = null;

  constructor() {
    super();

    this.addMenu({ category: 'settings', name: 'overlays', id: 'overlays' });
  }

  @command('!alert')
  @default_permission(permission.CASTERS)
  public async overlay(opts: CommandOptions) {
    if (!isMainThread) {
      global.workers.sendToMaster({ type: 'call', ns: 'overlays.alerts', fnc: 'overlay', args: [opts] });
      return;
    }
    opts.parameters = await new Message(opts.parameters).parse();

    let send: {[x: string]: string}[] = [];
    for (const string of opts.parameters.trim().split(' | ')) {
      const object = {};
      for (const setting of string.match(/([\w-]+)=([\w-:/.%?=$_|@&]+|'[\S ]+')/g) || []) {
        const data = { key: setting.split(/=(.+)/)[0], value: setting.split(/=(.+)/)[1] };
        if (data.key === 'text') {
          data.value = data.value.replace(/\$sender/g, opts.sender.username);
          data.value = data.value.substr(1).slice(0, -1);
        }
        object[data.key] = data.value;
      }
      send.push(object);
    }

    // remove clips without url or id
    send = send.filter((o) => (o.type === 'clip' && (isNil(o.id) || isNil(o.url))) || o.type !== 'clip');

    for (const object of send) {
      if (object.type === 'clip') {
      // load clip from api
        let clip: { data: any } = { data: [] };
        if (!isNil(object.id)) {
          clip = await global.api.getClipById(object.id);
        } else if (!isNil(object.url)) {
          clip = await global.api.getClipById(object.url.split('/').pop());
        }
        for (const c of clip.data) {
          object.url = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
        }
      }
    }

    this.emit('alert', send);
  }
}

export default Alerts;
export { Alerts };
