import Message from '../message';
import Registry from './_interface';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Text as TextEntity } from '../database/entity/text';
import customvariables from '../customvariables';

class Text extends Registry {
  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'textoverlay', id: 'registry.textoverlay/list' });
  }

  sockets () {
    const regexp = new RegExp('\\$_[a-zA-Z0-9_]+', 'g');

    adminEndpoint(this.nsp, 'text::remove', async(item: TextEntity, cb) => {
      await getRepository(TextEntity).remove(item);
      cb();
    });
    adminEndpoint(this.nsp, 'text::getAll', async(cb) => {
      cb(
        await getRepository(TextEntity).find(),
      );
    });
    adminEndpoint(this.nsp, 'text::save', async(item: TextEntity, cb) => {
      try {
        cb(
          null,
          await getRepository(TextEntity).save(item),
        );
      } catch (e) {
        cb(e, null);
      }
    });
    publicEndpoint(this.nsp, 'text::getOne', async (id, callback) => {
      const item = await getRepository(TextEntity).findOne({ id });
      if (item) {
        for (const variable of item.text.match(regexp) || []) {
          const isVariable = await customvariables.isVariableSet(variable);
          let value = `<strong>$_${variable.replace('$_', '')}</strong>`;
          if (isVariable) {
            value = await customvariables.getValueOf(variable) || '';
          }
          item.text = item.text.replace(new RegExp(`\\${variable}`, 'g'), value);
        }
        item.text = await new Message(item.text).parse();
        callback(item);
      }
      callback(null);
    });
  }
}

export default new Text();
