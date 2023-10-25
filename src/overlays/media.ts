import { Gallery } from '@entity/gallery.js';
import { isNil } from 'lodash-es';

import Overlay from './_interface.js';
import { command, default_permission } from '../decorators.js';
import { Message } from  '../message.js';

import { AppDataSource } from '~/database.js';
import { debug } from '~/helpers/log.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { publicEndpoint } from '~/helpers/socket.js';
import twitch from '~/services/twitch.js';

class Media extends Overlay {
  sockets() {
    publicEndpoint(this.nsp, 'cache', async (galleryCacheLimitInMb: number, cb: (err: string | null, ids: string[]) => void) => {
      const items = await AppDataSource.getRepository(Gallery).find();
      cb(null, items
        .filter(o => Buffer.from(o.data.split(',')[1], 'base64').length <= galleryCacheLimitInMb * 1024 * 1024)
        .map(o => o.id),
      );
    });
  }

  @command('!media')
  @default_permission(defaultPermissions.CASTERS)
  public async overlay(opts: CommandOptions): Promise<CommandResponse[]> {
    opts.parameters = await new Message(opts.parameters).parse();

    let send: {[x: string]: string}[] = [];
    for (const string of opts.parameters.trim().split(' | ')) {
      const object: {[x: string] : string} = {};
      for (const setting of string.match(/([\w-]+)=([\w-:/.%?=$_|@&]+|'[\S ]+')/g) || []) {
        const data = { key: setting.split(/=(.+)/)[0], value: setting.split(/=(.+)/)[1] };
        if (data.key === 'text') {
          data.value = data.value.replace(/\$sender/g, opts.sender.userName);
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
        if (!isNil(object.id)) {
          const clip = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.clips.getClipById(object.id));
          if (!clip) {
            continue;
          }
          object.url = clip.thumbnailUrl.replace('-preview-480x272.jpg', '.mp4');
        } else if (!isNil(object.url)) {
          const clip = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.clips.getClipById(object.url.split('/').pop() as string));
          if (!clip) {
            continue;
          }
          object.url = clip.thumbnailUrl.replace('-preview-480x272.jpg', '.mp4');
        }
      }
    }

    debug('alerts.emit', opts.parameters);
    this.emit('alert', send);
    return [];
  }
}

export default new Media();
