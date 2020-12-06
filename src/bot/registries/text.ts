import Message from '../message';
import Registry from './_interface';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Text as TextEntity } from '../database/entity/text';
import customvariables from '../customvariables';

const refreshMap = new Map<string, number>();

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
    publicEndpoint(this.nsp, 'generic::getOne', async (opts: { id: any; parseText: boolean, forceRefresh: boolean }, callback) => {
      try {
        if (opts.forceRefresh) {
          refreshMap.set(opts.id, 0);
        }

        // update every 5s or fail
        const gate = 5;
        const remainingSeconds = Math.round((Date.now() - (refreshMap.get(opts.id) ?? 0)) / 1000);
        if (remainingSeconds < gate) {
          throw new Error(`This resource can be updated in ${gate - remainingSeconds}s`);
        }

        const item = await getRepository(TextEntity).findOneOrFail({ id: opts.id });
        refreshMap.set(opts.id, Date.now());

        let text = item.text;
        if (opts.parseText) {
          text = await new Message(await customvariables.executeVariablesInText(text, null)).parse();
        }

        // cleanup old refresh items
        for (const [key, timestamp] of refreshMap.entries()) {
          if (Date.now() - timestamp > 30000) {
            refreshMap.delete(key);
          }
        }
        callback(null, {...item, text});
      } catch(e) {
        callback(e.message, null);
      }
    });
  }
}

export default new Text();
