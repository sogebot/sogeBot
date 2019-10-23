import * as _ from 'lodash';

import Message from '../message';
import Registry from './_interface';
import { publicEndpoint } from '../helpers/socket';

class Text extends Registry {
  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'textoverlay', id: 'registry.textoverlay/list' });
  }

  sockets () {
    const regexp = new RegExp('\\$_[a-zA-Z0-9_]+', 'g');
    publicEndpoint(this.nsp, 'get', async (_id, callback) => {
      const item = await global.db.engine.findOne(this.collection.data, { _id });
      if (item.text) {
        const match = item.text.match(regexp);
        if (!_.isNil(match)) {
          for (const variable of item.text.match(regexp)) {
            const isVariable = await global.customvariables.isVariableSet(variable);
            let value = `<strong>$_${variable.replace('$_', '')}</strong>`;
            if (isVariable) {
              value = await global.customvariables.getValueOf(variable);
            }
            item.text = item.text.replace(new RegExp(`\\${variable}`, 'g'), value);
          }
        }
        item.text = await new Message(item.text).parse();
      }
      callback({ html: item.text, css: item.css, js: item.js, external: item.external });
    });
  }
}

export default Text;
export { Text };
