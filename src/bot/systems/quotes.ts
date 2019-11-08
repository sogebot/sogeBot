import * as _ from 'lodash';

import { prepare, sendMessage } from '../commons';
import { command, default_permission } from '../decorators';
import Expects from '../expects';
import { permission } from '../permissions';
import System from './_interface';
import { adminEndpoint, publicEndpoint } from '../helpers/socket';
import { getManager } from 'typeorm';

import { Quotes as QuotesEntity } from '../entity/quotes';

class Quotes extends System {
  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'quotes', id: 'manage/quotes/list' });
  }

  sockets() {
    publicEndpoint(this.nsp, 'find', async (_opts, cb) => {
      const items = await getManager()
        .createQueryBuilder()
        .select('quote')
        .from(QuotesEntity, 'quote')
        .getMany();
      for (const item of (items as any[])) {
        item.quotedByName = await global.users.getNameById(item.quotedBy);
      }
      cb(null, items);
    });

    adminEndpoint(this.nsp, 'getById', async (id, cb) => {
      const item = await getManager()
        .createQueryBuilder()
        .select('quote')
        .where('id = :id', { id })
        .from(QuotesEntity, 'quote')
        .getOne();
      cb(null, item);
    });

    adminEndpoint(this.nsp, 'setById', async (id, dataset, cb) => {
      let item = await getManager()
        .createQueryBuilder()
        .select('quote')
        .where('id = :id', { id })
        .from(QuotesEntity, 'quote')
        .getOne();
      if (item) {
        await getManager()
          .createQueryBuilder()
          .update(QuotesEntity)
          .where('id = :id', { id })
          .set(dataset)
          .execute();
      } else {
        const result = await getManager()
          .createQueryBuilder()
          .insert()
          .into(QuotesEntity)
          .values(dataset)
          .execute();
        item = result.generatedMaps[0] as QuotesEntity;
      }
      cb(null, item);
    });

    adminEndpoint(this.nsp, 'deleteById', async (id, cb) => {
      await getManager()
        .createQueryBuilder()
        .delete()
        .from(QuotesEntity)
        .where('id = :id', { id })
        .execute();
      cb(null);
    });
  }

  @command('!quote add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    try {
      if (opts.parameters.length === 0) {
        throw new Error();
      }
      let [tags, quote] = new Expects(opts.parameters).argument({ name: 'tags', optional: true, default: 'general', multi: true, delimiter: '' }).argument({ name: 'quote', multi: true, delimiter: '' }).toArray();
      tags = tags.split(',').map((o) => o.trim());

      const result = await getManager()
        .createQueryBuilder()
        .insert()
        .into(QuotesEntity)
        .values({ tags, quote, quotedBy: opts.sender.userId, createdAt: Date.now() })
        .execute();
      const message = await prepare('systems.quotes.add.ok', { id: result.identifiers[0].id, quote, tags: tags.join(', ') });
      sendMessage(message, opts.sender, opts.attr);
      return { id: result.identifiers[0].id, quote, tags };
    } catch (e) {
      const message = await prepare('systems.quotes.add.error', { command: opts.command });
      sendMessage(message, opts.sender, opts.attr);
      return {};
    }
  }

  @command('!quote remove')
  @default_permission(permission.CASTERS)
  async remove (opts) {
    try {
      if (opts.parameters.length === 0) {
        throw new Error();
      }
      const id = new Expects(opts.parameters).argument({ type: 'uuid', name: 'id' }).toArray()[0];
      let item = await getManager()
        .createQueryBuilder()
        .select('quote')
        .from(QuotesEntity, 'quote')
        .where('id = :id', { id })
        .getOne();

      if (!item) {
        const message = await prepare('systems.quotes.remove.not-found', { id });
        sendMessage(message, opts.sender, opts.attr);
        return;
      } else {
        await getManager()
          .createQueryBuilder()
          .delete()
          .from(QuotesEntity)
          .where('id = :id', { id })
          .execute();
        item = await getManager()
          .createQueryBuilder()
          .select('quote')
          .from(QuotesEntity, 'quote')
          .where('id = :id', { id })
          .getOne();
        if (typeof item === 'undefined') {
          const message = await prepare('systems.quotes.remove.ok', { id });
          sendMessage(message, opts.sender, opts.attr);
        } else {
          throw new Error('Something went wrong');
        }
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
      if (opts.parameters.length === 0) {
        throw new Error();
      }
      const [id, tag] = new Expects(opts.parameters).argument({ type: 'uuid', name: 'id' }).argument({ name: 'tag', multi: true, delimiter: '' }).toArray();
      const quote = await getManager()
        .createQueryBuilder()
        .select('quote')
        .from(QuotesEntity, 'quote')
        .where('id = :id', { id })
        .getOne();
      if (quote) {
        const tags = tag.split(',').map((o) => o.trim());
        await getManager()
          .createQueryBuilder()
          .update(QuotesEntity)
          .where('id = :id', { id })
          .set({ tags })
          .execute();
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
    const urlBase = global.ui.domain;
    const message = await prepare(
      (['localhost', '127.0.0.1'].includes(urlBase) ? 'systems.quotes.list.is-localhost' : 'systems.quotes.list.ok'),
      { urlBase });
    return sendMessage(message, opts.sender, opts.attr);
  }

  @command('!quote')
  async main (opts) {
    const [id, tag] = new Expects(opts.parameters).argument({ type: 'uuid', name: 'id', optional: true }).argument({ name: 'tag', optional: true, multi: true, delimiter: '' }).toArray();
    if (_.isNil(id) && _.isNil(tag) || id === '-tag') {
      const message = await prepare('systems.quotes.show.error.no-parameters', { command: opts.command });
      return sendMessage(message, opts.sender, opts.attr);
    }

    if (!_.isNil(id)) {
      const quote = await getManager()
        .createQueryBuilder()
        .select('quote')
        .from(QuotesEntity, 'quote')
        .where('id = :id', { id })
        .getOne();
      if (!_.isEmpty(quote) && typeof quote !== 'undefined') {
        const quotedBy = (await global.users.getUsernamesFromIds([quote.quotedBy]))[quote.quotedBy];
        const message = await prepare('systems.quotes.show.ok', { quote: quote.quote, id: quote.id, quotedBy });
        sendMessage(message, opts.sender, opts.attr);
      } else {
        const message = await prepare('systems.quotes.show.error.not-found-by-id', { id });
        sendMessage(message, opts.sender, opts.attr);
      }
    } else {
      const quotes = await getManager()
        .createQueryBuilder()
        .select('quote')
        .from(QuotesEntity, 'quote')
        .getMany();

      const quotesWithTags: QuotesEntity[] = [];
      for (const quote of quotes) {
        if (quote.tags.includes(tag)) {
          quotesWithTags.push(quote);
        }
      }

      if (quotesWithTags.length > 0) {
        const quote = _.sample(quotesWithTags);
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
