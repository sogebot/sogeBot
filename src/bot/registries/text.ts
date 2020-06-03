import Message from '../message';
import Registry from './_interface';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Text as TextEntity } from '../database/entity/text';
import customvariables from '../customvariables';

class Text extends Registry {
  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'textoverlay', id: 'registry.textoverlay/list', this: null });
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
          text = await new Message(await customvariables.executeVariablesInText(text)).parse();
        }
        callback(null, {...item, text});
      } catch(e) {
        callback(e, null);
      }
    });
  }
}

export default new Text();
