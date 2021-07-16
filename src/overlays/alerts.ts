import { isNil } from 'lodash';
import { getRepository } from 'typeorm';

import api from '../api';
import { Gallery } from '../database/entity/gallery';
import { command, default_permission } from '../decorators';
import { debug } from '../helpers/log';
import { defaultPermissions } from '../helpers/permissions/';
import { publicEndpoint } from '../helpers/socket';
import Message from '../message';
import Overlay from './_interface';

class Alerts extends Overlay {
  sockets() {
    publicEndpoint(this.nsp, 'cache', async (galleryCacheLimitInMb: number, cb: (err: string | null, ids: string[]) => void) => {
      const items = await getRepository(Gallery).find();
      cb(null, items
        .filter(o => Buffer.from(o.data.split(',')[1], 'base64').length <= galleryCacheLimitInMb * 1024 * 1024)
        .map(o => o.id),
      );
    });
  }

  @command('!alert')
  @default_permission(defaultPermissions.CASTERS)
  public async overlay(opts: CommandOptions): Promise<CommandResponse[]> {
    opts.parameters = await new Message(opts.parameters).parse();

    let send: {[x: string]: string}[] = [];
    for (const string of opts.parameters.trim().split(' | ')) {
      const object: {[x: string] : string} = {};
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
          clip = await api.getClipById(object.url.split('/').pop() as string);
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
