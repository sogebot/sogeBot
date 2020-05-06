import { v4 as uuidv4 } from 'uuid';
import Expects from '../expects';
import Message from '../message';
import { command, default_permission, parser } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { isUUID, parserReply, prepare } from '../commons';
import XRegExp from 'xregexp';
import { debug, error } from '../helpers/log';

import { Keyword, KeywordInterface } from '../database/entity/keyword';
import { getRepository } from 'typeorm';
import { adminEndpoint } from '../helpers/socket';
import { translate } from '../translate';

/*
 * !keyword                                     - gets an info about keyword usage
 * !keyword add -k [regexp] -r [response]       - add keyword with specified response
 * !keyword edit -k [uuid|regexp] -r [response] - edit keyword with specified response
 * !keyword remove -k [uuid|regexp]             - remove specified keyword
 * !keyword toggle -k [uuid|regexp]             - enable/disable specified keyword
 * !keyword list                                - get keywords list
 */
class Keywords extends System {
  constructor() {
    super();
    this.addMenu({ category: 'manage', name: 'keywords', id: 'manage/keywords/list' });
  }

  sockets () {
    adminEndpoint(this.nsp, 'keywords::save', async (dataset: KeywordInterface, cb) => {
      try {
        const item = await getRepository(Keyword).save(dataset);
        cb(null, item);
      } catch (e) {
        cb (e, null);
      }
    });
    adminEndpoint(this.nsp, 'keywords::deleteById', async (id, cb) => {
      await getRepository(Keyword).delete({ id });
      cb();
    });
    adminEndpoint(this.nsp, 'keywords::getAll', async (cb) => {
      try {
        const items = await getRepository(Keyword).find({
          order: {
            keyword: 'ASC',
          },
        });
        cb(null, items);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'keywords::getById', async (id, cb) => {
      try {
        const item = await getRepository(Keyword).findOne({
          where: { id },
        });
        if (!item) {
          cb('Item not found');
        } else {
          cb(null, item);
        }
      } catch (e) {
        cb(e.stack);
      }
    });
  }

  @command('!keyword')
  @default_permission(permission.CASTERS)
  public main(opts: CommandOptions): CommandResponse[] {
    let url = 'http://sogehige.github.io/sogeBot/#/commands/keywords';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogehige.github.io/sogeBot/#/_master/commands/keywords';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  /**
   * Add new keyword
   *
   * format: !keyword add -k [regexp] -r [response]
   * @param {CommandOptions} opts - options
   * @return {Promise<CommandResponse[]>}
   */
  @command('!keyword add')
  @default_permission(permission.CASTERS)
  public async add(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [keywordRegex, response]
        = new Expects(opts.parameters)
          .argument({ name: 'k', optional: false, multi: true, delimiter: '' })
          .argument({ name: 'r', optional: false, multi: true, delimiter: '' })
          .toArray();
      const data: Required<KeywordInterface> = {
        id: uuidv4(),
        keyword: keywordRegex,
        response,
        enabled: true,
      };
      await getRepository(Keyword).save(data);
      return [{ response: prepare('keywords.keyword-was-added', data), ...opts }];
    } catch (e) {
      error(e.stack);
      return [{ response: prepare('keywords.keyword-parse-failed'), ...opts }];
    }
  }

  /**
   * Edit keyword
   *
   * format: !keyword edit -k [uuid|regexp] -r [response]
   * @param {CommandOptions} opts - options
   * @return {Promise<CommandResponse[]>}
   */
  @command('!keyword edit')
  @default_permission(permission.CASTERS)
  public async edit(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [keywordRegexOrUUID, response]
        = new Expects(opts.parameters)
          .argument({ name: 'k', optional: false, multi: true, delimiter: '' })
          .argument({ name: 'r', optional: false, multi: true, delimiter: '' })
          .toArray();

      let keywords: Required<KeywordInterface>[] = [];
      if (isUUID(keywordRegexOrUUID)) {
        keywords = await getRepository(Keyword).find({ where: { id: keywordRegexOrUUID } });
      } else {
        keywords = await getRepository(Keyword).find({ where: { keyword: keywordRegexOrUUID } });
      }

      if (keywords.length === 0) {
        return [{ response: prepare('keywords.keyword-was-not-found'), ...opts }];
      } else if (keywords.length > 1) {
        return [{ response: prepare('keywords.keyword-is-ambiguous'), ...opts }];
      } else {
        keywords[0].response = response;
        await getRepository(Keyword).save(keywords);
        return [{ response: prepare('keywords.keyword-was-edited', keywords[0]), ...opts }];
      }
    } catch (e) {
      error(e.stack);
      return [{ response: prepare('keywords.keyword-parse-failed'), ...opts }];
    }
  }

  /**
   * Bot responds with list of keywords
   *
   * @param {CommandOptions} opts
   * @returns {Promise<CommandResponse[]>}
   */
  @command('!keyword list')
  @default_permission(permission.CASTERS)
  public async list(opts: CommandOptions): Promise<CommandResponse[]> {
    const keywords = await getRepository(Keyword).find({ order: { keyword: 'ASC' } });
    const list = keywords.map((o) => {
      return `${o.enabled ? '🗹' : '☐'} ${o.id} | ${o.keyword} | ${o.response}`;
    });

    const responses: CommandResponse[] = [];
    if (keywords.length === 0) {
      responses.push({ response: prepare('keywords.list-is-empty'), ...opts });
    } else {
      responses.push({ response: prepare('keywords.list-is-not-empty'), ...opts });
    }

    for (let i = 0; i < list.length; i++) {
      responses.push({ response: list[i], ...opts });
    }
    return responses;
  }


  /**
   * Remove keyword
   *
   * format: !keyword edit -k [uuid|regexp]
   * @param {CommandOptions} opts - options
   * @return {Promise<CommandResponse[]>}
   */
  @command('!keyword remove')
  @default_permission(permission.CASTERS)
  public async remove(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [keywordRegexOrUUID]
        = new Expects(opts.parameters)
          .argument({ name: 'k', optional: false, multi: true, delimiter: '' })
          .toArray();

      let keywords: Required<KeywordInterface>[] = [];
      if (isUUID(keywordRegexOrUUID)) {
        keywords = await getRepository(Keyword).find({ where: { id: keywordRegexOrUUID } });
      } else {
        keywords = await getRepository(Keyword).find({ where: { keyword: keywordRegexOrUUID } });
      }

      if (keywords.length === 0) {
        return [{ response: prepare('keywords.keyword-was-not-found'), ...opts }];
      } else if (keywords.length > 1) {
        return [{ response: prepare('keywords.keyword-is-ambiguous'), ...opts }];
      } else {
        await getRepository(Keyword).remove(keywords);
        return [{ response: prepare('keywords.keyword-was-removed', keywords[0]), ...opts }];
      }
    } catch (e) {
      error(e.stack);
      return [{ response: prepare('keywords.keyword-parse-failed'), ...opts }];
    }
  }


  /**
   * Enable/disable keyword
   *
   * format: !keyword toggle -k [uuid|regexp]
   * @param {CommandOptions} opts - options
   * @return {Promise<CommandResponse[]>}
   */
  @command('!keyword toggle')
  @default_permission(permission.CASTERS)
  public async toggle(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [keywordRegexOrUUID]
        = new Expects(opts.parameters)
          .argument({ name: 'k', optional: false, multi: true, delimiter: '' })
          .toArray();

      let keywords: Required<KeywordInterface>[] = [];
      if (isUUID(keywordRegexOrUUID)) {
        keywords = await getRepository(Keyword).find({ where: { id: keywordRegexOrUUID } });
      } else {
        keywords = await getRepository(Keyword).find({ where: { keyword: keywordRegexOrUUID } });
      }

      if (keywords.length === 0) {
        return [{ response: prepare('keywords.keyword-was-not-found'), ...opts }];
      } else if (keywords.length > 1) {
        return [{ response: prepare('keywords.keyword-is-ambiguous'), ...opts }];
      } else {
        keywords[0].enabled = !keywords[0].enabled;
        await getRepository(Keyword).save(keywords);
        return [{ response: prepare(keywords[0].enabled ? 'keywords.keyword-was-enabled' : 'keywords.keyword-was-disabled', keywords[0]), ...opts }];
      }
    } catch (e) {
      error(e.stack);
      return [{ response: prepare('keywords.keyword-parse-failed'), ...opts }];
    }
  }

  /**
   * Parses message for keywords
   *
   * @param {ParserOptions} opts
   * @return true
   */
  @parser({ fireAndForget: true })
  public async run(opts: ParserOptions) {
    if (opts.message.trim().startsWith('!')) {
      return true;
    }

    const keywords = (await getRepository(Keyword).find()).filter((o) => {
      const regexp = `([!"#$%&'()*+,-.\\/:;<=>?\\b\\s]${o.keyword}[!"#$%&'()*+,-.\\/:;<=>?\\b\\s])|(^${o.keyword}[!"#$%&'()*+,-.\\/:;<=>?\\b\\s])|([!"#$%&'()*+,-.\\/:;<=>?\\b\\s]${o.keyword}$)|(^${o.keyword}$)`;
      const isFoundInMessage = XRegExp(regexp, 'giu').test(opts.message);
      const isEnabled = o.enabled;
      debug('keywords.run', `\n\t<\t${opts.message}\n\t?\t${o.keyword}\n\t-\tisFoundInMessage: ${isFoundInMessage}, isEnabled: ${isEnabled}\n\t-\t${regexp}`);
      return isFoundInMessage && isEnabled;
    });

    for (const k of keywords) {
      const message = await (new Message(k.response).parse({ sender: opts.sender }));
      debug('keywords.run', {k, message});
      if (opts.sender.discord) {
        const messageToSend = await new Message(await message).parse({
          forceWithoutAt: true, // we dont need @
          sender: { ...opts.sender, username: opts.sender.discord.author },
        }) as string;
        opts.sender.discord.channel.send(messageToSend);
      } else {
        parserReply(message, opts);
      }
    }
    return true;
  }
}

export default new Keywords();