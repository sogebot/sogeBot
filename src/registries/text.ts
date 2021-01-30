import { getRepository } from 'typeorm';

import { Text as TextEntity } from '../database/entity/text';
import { onStartup } from '../decorators/on';
import { executeVariablesInText } from '../helpers/customvariables';
import { csEmitter } from '../helpers/customvariables/emitter';
import { ioServer } from '../helpers/panel';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import Message from '../message';
import Registry from './_interface';

class Text extends Registry {
  constructor () {
    super();
    this.addMenu({
      category: 'registry', name: 'textoverlay', id: 'registry.textoverlay', this: null,
    });
  }

  @onStartup()
  onStartup() {
    csEmitter.on('variable-changed', (variableName) => {
      if(ioServer) {
        for (const socket of ioServer.of(this.nsp).sockets.values()) {
          socket.emit('variable-changed', variableName);
        }
      }
    });
  }

  sockets () {
    adminEndpoint(this.nsp, 'text::remove', async(item, cb) => {
      try {
        await getRepository(TextEntity).remove(item);
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'generic::getAll', async(cb) => {
      try {
        cb(
          null,
          await getRepository(TextEntity).find(),
        );
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'text::save', async(item, cb) => {
      try {
        cb(
          null,
          await getRepository(TextEntity).save(item),
        );
      } catch (e) {
        cb(e.stack, null);
      }
    });
    publicEndpoint(this.nsp, 'generic::getOne', async (opts: { id: any; parseText: boolean }, callback) => {
      try {
        const item = await getRepository(TextEntity).findOneOrFail({ id: opts.id });

        let text = item.text;
        if (opts.parseText) {
          text = await new Message(await executeVariablesInText(text, null)).parse();
        }

        callback(null, { ...item, parsedText: text });
      } catch(e) {
        callback(e.message, null);
      }
    });
  }
}

export default new Text();
