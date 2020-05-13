import Message from '../message';
import Registry from './_interface';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Text as TextEntity, TextInterface } from '../database/entity/text';
import customvariables from '../customvariables';

class Text extends Registry {
  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'textoverlay', id: 'registry.textoverlay/list' });
  }

  sockets () {
    adminEndpoint(this.nsp, 'text::remove', async(item: Required<TextInterface>, cb) => {
      try {
        await getRepository(TextEntity).remove(item);
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'text::getAll', async(cb) => {
      try {
        cb(
          null,
          await getRepository(TextEntity).find(),
        );
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'text::save', async(item: TextInterface, cb) => {
      try {
        cb(
          null,
          await getRepository(TextEntity).save(item),
        );
      } catch (e) {
        cb(e.stack, null);
      }
    });
    publicEndpoint(this.nsp, 'text::getOne', async (id, parseText = false, callback) => {
      try {
        const item = await getRepository(TextEntity).findOne({ id });
        let text = '';
        if (item) {
          text = item.text;
          if (parseText) {
            text = await new Message(await customvariables.executeVariablesInText(text)).parse();
          }
          callback(null, {...item, text});
        }
        callback(null, null);
      } catch(e) {
        callback(e, null);
      }
    });
  }
}

export default new Text();
