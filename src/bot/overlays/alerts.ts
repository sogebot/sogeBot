import { isNil } from 'lodash';

import { command, default_permission, settings, ui } from '../decorators';
import Message from '../message';
import { permission } from '../helpers/permissions';
import Overlay from './_interface';
import api from '../api';
import { publicEndpoint } from '../helpers/socket';
import { Gallery } from '../database/entity/gallery';
import { getRepository } from 'typeorm';
import { debug } from '../helpers/log';

class Alerts extends Overlay {
  @ui({
    type: 'link',
    href: '/overlays/alerts',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/alerts',
    target: '_blank',
  }, 'links')
  linkBtn = null;

  @settings()
  galleryCache = false;
  @settings()
  @ui({ type: 'number-input', step: '0.5', min: '0.5' })
  galleryCacheLimitInMb = 50;

  sockets() {
    publicEndpoint(this.nsp, 'cache', async (cb: (err: string | null, ids: string[]) => void) => {
      if (this.galleryCache) {
        const items = await getRepository(Gallery).createQueryBuilder('gallery').select('id').addSelect('data').execute();
        cb(null, items
          .filter(o => Buffer.from(o.data.split(',')[1], 'base64').length <= this.galleryCacheLimitInMb * 1024 * 1024)
          .map(o => o.id)
        );
      } else {
        cb('Gallery cache disabled.', []);
      }
    });
  }

  @command('!alert')
  @default_permission(permission.CASTERS)
  public async overlay(opts: CommandOptions): Promise<CommandResponse[]> {
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
          clip = await api.getClipById(object.id);
        } else if (!isNil(object.url)) {
          clip = await api.getClipById(object.url.split('/').pop());
        }
        for (const c of clip.data) {
          object.url = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4');
        }
      }
    }

    debug('alerts.emit', opts.parameters);
    this.emit('alert', send);
    return [];
  }
}

export default new Alerts();
