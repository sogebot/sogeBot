import * as _ from 'lodash';

import config from '@config';

import { prepare, sendMessage } from '../commons';
import { command, default_permission, settings } from '../decorators';
import Expects from '../expects';
import { permission } from '../permissions';
import System from './_interface';

interface Quote {
  quotedBy: string; id: string; quote: string; tags: string;
}

class Quotes extends System {
  @settings()
  urlBase: string = config.panel.domain.split(',').map((o) => o.trim())[0];

  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'quotes', id: 'quotes/list' });
  }

  @command('!quote add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    try {
      if (opts.parameters.length === 0) {throw new Error();}
      let [tags, quote] = new Expects(opts.parameters).argument({ name: 'tags', optional: true, default: 'general', multi: true, delimiter: '' }).argument({ name: 'quote', multi: true, delimiter: '' }).toArray();
      tags = tags.split(',').map((o) => o.trim());

      const quotes: Quote[] = await global.db.engine.find(this.collection.data, {});
      let id;
      if (!_.isEmpty(quotes)) {
        const maxBy = _.maxBy(quotes, 'id');
        if (maxBy) {
          id = maxBy.id + 1;
        }
      } else {
        id = 1;
      }

      await global.db.engine.insert(this.collection.data, { id, tags, quote, quotedBy: opts.sender.userId, createdAt: new Date() });

      const message = await prepare('systems.quotes.add.ok', { id, quote, tags: tags.join(', ') });
      sendMessage(message, opts.sender, opts.attr);
    } catch (e) {
      const message = await prepare('systems.quotes.add.error', { command: opts.command });
      sendMessage(message, opts.sender, opts.attr);
    }
  }

  @command('!quote remove')
  @default_permission(permission.CASTERS)
  async remove (opts) {
    try {
      if (opts.parameters.length === 0) {throw new Error();}
      const id = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).toArray()[0];
      if (_.isNaN(id)) {throw new Error();}

      const item = await global.db.engine.remove(this.collection.data, { id });
      if (item > 0) {
        const message = await prepare('systems.quotes.remove.ok', { id });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        const message = await prepare('systems.quotes.remove.not-found', { id });
        sendMessage(message, opts.sender, opts.attr);
      }
    } catch (e) {
      const message = await prepare('systems.quotes.remove.error');
      sendMessage(message, opts.sender, opts.attr);
    }
  }

  @command('!quote set')
  @default_permission(permission.CASTERS)
  async set (opts) {
    try {
      if (opts.parameters.length === 0) {throw new Error();}
      const [id, tag] = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).argument({ name: 'tag', multi: true, delimiter: '' }).toArray();
      const quote = await global.db.engine.findOne(this.collection.data, { id });
      if (!_.isEmpty(quote)) {
        const tags = tag.split(',').map((o) => o.trim());
        await global.db.engine.update(this.collection.data, { id }, { tags });
        const message = await prepare('systems.quotes.set.ok', { id, tags: tags.join(', ') });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        const message = await prepare('systems.quotes.set.error.not-found-by-id', { id });
        sendMessage(message, opts.sender, opts.attr);
      }
    } catch (e) {
      const message = await prepare('systems.quotes.set.error.no-parameters', { command: opts.command });
      sendMessage(message, opts.sender, opts.attr);
    }
  }

  @command('!quote list')
  async list (opts) {
    const urlBase = this.urlBase;
    const message = await prepare(
      (['localhost', '127.0.0.1'].includes(urlBase) ? 'systems.quotes.list.is-localhost' : 'systems.quotes.list.ok'),
      { urlBase });
    return sendMessage(message, opts.sender, opts.attr);
  }

  @command('!quote')
  async main (opts) {
    const [id, tag] = new Expects(opts.parameters).argument({ type: Number, name: 'id', optional: true }).argument({ name: 'tag', optional: true, multi: true, delimiter: '' }).toArray();
    if (_.isNil(id) && _.isNil(tag)) {
      const message = await prepare('systems.quotes.show.error.no-parameters', { command: opts.command });
      return sendMessage(message, opts.sender, opts.attr);
    }

    if (!_.isNil(id)) {
      const quote: Quote | undefined = await global.db.engine.findOne(this.collection.data, { id });
      if (!_.isEmpty(quote) && typeof quote !== 'undefined') {
        const quotedBy = (await global.users.getUsernamesFromIds([quote.quotedBy]))[quote.quotedBy];
        const message = await prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        const message = await prepare('systems.quotes.show.error.not-found-by-id', { id });
        sendMessage(message, opts.sender, opts.attr);
      }
    } else {
      const quotes: Quote[] = await global.db.engine.find(this.collection.data);
      const quotesWithTags: Quote[] = [];

      for (const quote of quotes) {
        if (quote.tags.includes(tag)) {
          quotesWithTags.push(quote);
        }
      }

      if (quotesWithTags.length > 0) {
        const quote: Quote | undefined = _.sample(quotesWithTags);
        if (typeof quote !== 'undefined') {
          const quotedBy = (await global.users.getUsernamesFromIds([quote.quotedBy]))[quote.quotedBy];
          const message = await prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy });
          sendMessage(message, opts.sender, opts.attr);
        }
      } else {
        const message = await prepare('systems.quotes.show.error.not-found-by-tag', { tag });
        sendMessage(message, opts.sender, opts.attr);
      }
    }
  }
}

export default Quotes;
export { Quotes };
