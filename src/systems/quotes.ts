import { Quotes as QuotesEntity } from '@entity/quotes.js';
import { sample } from '@sogebot/ui-helpers/array.js';
import { validateOrReject } from 'class-validator';
import * as _ from 'lodash-es';
import { merge } from 'lodash-es';

import System from './_interface.js';
import { command, default_permission } from '../decorators.js';
import { Expects } from  '../expects.js';

import { AppDataSource } from '~/database.js';
import { prepare } from '~/helpers/commons/index.js';
import { app } from '~/helpers/panel.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { domain } from '~/helpers/ui/index.js';
import getNameById from '~/helpers/user/getNameById.js';
import { adminMiddleware } from '~/socket.js';

class Quotes extends System {
  constructor () {
    super();

    this.addMenu({
      category: 'manage', name: 'quotes', id: 'manage/quotes', this: this,
    });
    this.addMenuPublic({ id: 'quotes', name: 'quotes' });
  }

  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/quotes', async (req, res) => {
      const quotes = await QuotesEntity.find();
      res.send({
        data:  quotes,
        users: await Promise.all(quotes.map(quote => new Promise<[string, string]>(resolve => getNameById(quote.quotedBy).then((username) => resolve([quote.quotedBy, username]))))),
      });
    });
    app.get('/api/systems/quotes/:id', adminMiddleware, async (req, res) => {
      const quote = await QuotesEntity.findOneBy({ id: Number(req.params.id) });
      res.send({
        data: await QuotesEntity.findOneBy({ id: Number(req.params.id) }),
        user: quote ? await getNameById(quote.quotedBy) : null,
      });
    });
    app.delete('/api/systems/quotes/:id', adminMiddleware, async (req, res) => {
      await QuotesEntity.delete({ id: Number(req.params.id) });
      res.status(404).send();
    });
    app.post('/api/systems/quotes', adminMiddleware, async (req, res) => {
      try {
        const itemToSave = new QuotesEntity();
        merge(itemToSave, req.body);
        await validateOrReject(itemToSave);
        await itemToSave.save();
        res.send({ data: itemToSave });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
    });
  }

  @command('!quote add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions): Promise<(CommandResponse & Partial<QuotesEntity>)[]> {
    try {
      if (opts.parameters.length === 0) {
        throw new Error();
      }
      const [tags, quote] = new Expects(opts.parameters).argument({
        name: 'tags', optional: true, default: 'general', multi: true, delimiter: '',
      }).argument({
        name: 'quote', multi: true, delimiter: '',
      }).toArray() as [ string, string ];
      const tagsArray = tags.split(',').map((o) => o.trim());

      const entity = new QuotesEntity();
      entity.tags = tagsArray;
      entity.quote = quote;
      entity.quotedBy = opts.sender.userId;
      entity.createdAt = new Date().toISOString(),
      await entity.save();
      const response = prepare('systems.quotes.add.ok', {
        id: entity.id, quote, tags: tagsArray.join(', '),
      });
      return [{
        response, ...opts, ...entity,
      }];
    } catch (e: any) {
      const response = prepare('systems.quotes.add.error', { command: opts.command });
      return [{
        response, ...opts, createdAt: new Date(0).toISOString(), attr: {}, quote: '', quotedBy: '0', tags: [],
      }];
    }
  }

  @command('!quote remove')
  @default_permission(defaultPermissions.CASTERS)
  async remove (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (opts.parameters.length === 0) {
        throw new Error();
      }
      const id = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).toArray()[0];
      const item = await AppDataSource.getRepository(QuotesEntity).findOneBy({ id });

      if (!item) {
        const response = prepare('systems.quotes.remove.not-found', { id });
        return [{ response, ...opts }];
      } else {
        await AppDataSource.getRepository(QuotesEntity).delete({ id });
        const response = prepare('systems.quotes.remove.ok', { id });
        return [{ response, ...opts }];
      }
    } catch (e: any) {
      const response = prepare('systems.quotes.remove.error');
      return [{ response, ...opts }];
    }
  }

  @command('!quote set')
  @default_permission(defaultPermissions.CASTERS)
  async set (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (opts.parameters.length === 0) {
        throw new Error();
      }
      const [id, tag] = new Expects(opts.parameters).argument({ type: Number, name: 'id' }).argument({
        name: 'tag', multi: true, delimiter: '',
      }).toArray() as [ number, string ];

      const quote = await AppDataSource.getRepository(QuotesEntity).findOneBy({ id });
      if (quote) {
        const tags = tag.split(',').map((o) => o.trim());
        await AppDataSource
          .createQueryBuilder()
          .update(QuotesEntity)
          .where('id = :id', { id })
          .set({ tags })
          .execute();
        const response = prepare('systems.quotes.set.ok', { id, tags: tags.join(', ') });
        return [{ response, ...opts }];
      } else {
        const response = prepare('systems.quotes.set.error.not-found-by-id', { id });
        return [{ response, ...opts }];
      }
    } catch (e: any) {
      const response = prepare('systems.quotes.set.error.no-parameters', { command: opts.command });
      return [{ response, ...opts }];
    }
  }

  @command('!quote list')
  async list (opts: CommandOptions): Promise<CommandResponse[]> {
    const response = prepare(
      (['localhost', '127.0.0.1'].includes(domain.value) ? 'systems.quotes.list.is-localhost' : 'systems.quotes.list.ok'),
      { urlBase: domain.value });
    return [{ response, ...opts }];
  }

  @command('!quote')
  async main (opts: CommandOptions): Promise<CommandResponse[]> {
    const [id, tag] = new Expects(opts.parameters).argument({
      type: Number, name: 'id', optional: true,
    }).argument({
      name: 'tag', optional: true, multi: true, delimiter: '',
    }).toArray();
    if (_.isNil(id) && _.isNil(tag) || id === '-tag') {
      const response = prepare('systems.quotes.show.error.no-parameters', { command: opts.command });
      return [{ response, ...opts }];
    }

    if (!_.isNil(id)) {
      const quote = await AppDataSource.getRepository(QuotesEntity).findOneBy({ id });
      if (!_.isEmpty(quote) && typeof quote !== 'undefined') {
        const quotedBy = await getNameById(quote.quotedBy);
        const response = prepare('systems.quotes.show.ok', {
          quote: quote.quote, id: quote.id, quotedBy,
        });
        return [{ response, ...opts }];
      } else {
        const response = prepare('systems.quotes.show.error.not-found-by-id', { id });
        return [{ response, ...opts }];
      }
    } else {
      const quotes = await AppDataSource.getRepository(QuotesEntity).find();
      const quotesWithTags: QuotesEntity[] = [];
      for (const quote of quotes) {
        if (quote.tags.includes(tag)) {
          quotesWithTags.push(quote);
        }
      }

      if (quotesWithTags.length > 0) {
        const quote = sample(quotesWithTags);
        if (typeof quote !== 'undefined') {
          const quotedBy = await getNameById(quote.quotedBy);
          const response = prepare('systems.quotes.show.ok', {
            quote: quote.quote, id: quote.id, quotedBy,
          });
          return [{ response, ...opts }];
        }
        const response = prepare('systems.quotes.show.error.not-found-by-tag', { tag });
        return [{ response, ...opts }];
      } else {
        const response = prepare('systems.quotes.show.error.not-found-by-tag', { tag });
        return [{ response, ...opts }];
      }
    }
  }
}

export default new Quotes();
