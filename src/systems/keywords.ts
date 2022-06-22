import {
  Keyword, KeywordGroup, KeywordGroupInterface, KeywordInterface, KeywordsResponsesInterface,
} from '@entity/keyword';
import _ from 'lodash';
import { getRepository } from 'typeorm';
import XRegExp from 'xregexp';

import { parserReply } from '../commons';
import {
  command, default_permission, helper, parser, timer,
} from '../decorators';
import Expects from '../expects';
import System from './_interface';

import { checkFilter } from '~/helpers/checkFilter';
import { isUUID, prepare } from '~/helpers/commons';
import {
  debug, error, warning,
} from '~/helpers/log';
import {
  addToViewersCache, get, getFromViewersCache,
} from '~/helpers/permissions';
import { check, defaultPermissions } from '~/helpers/permissions/index';
import { adminEndpoint } from '~/helpers/socket';
import { translate } from '~/translate';

class Keywords extends System {
  constructor() {
    super();
    this.addMenu({
      category: 'commands', name: 'keywords', id: 'commands/keywords', this: this,
    });
  }

  sockets () {
    adminEndpoint('/systems/keywords', 'generic::groups::save', async (item, cb) => {
      try {
        cb(null, await getRepository(KeywordGroup).save(item));
      } catch (e) {
        if (e instanceof Error) {
          cb(e.message, undefined);
        }
      }

    });
    adminEndpoint('/systems/keywords', 'generic::groups::getAll', async (cb) => {
      let [ keywordGroup, keyword ] = await Promise.all([
        getRepository(KeywordGroup).find(), getRepository(Keyword).find(),
      ]);

      for (const item of keyword) {
        if (item.group && !keywordGroup.find(o => o.name === item.group)) {
          // we dont have any group options -> create temporary group
          const group: KeywordGroupInterface = {
            name:    item.group,
            options: {
              filter:     null,
              permission: null,
            },
          };
          keywordGroup = [
            ...keywordGroup,
            group,
          ];
        }
      }
      cb(null, keywordGroup);
    });
    adminEndpoint('/systems/keywords', 'generic::setById', async (opts, cb) => {
      try {
        const item = await getRepository(Keyword).findOne({ id: String(opts.id) });
        await getRepository(Keyword).save({ ...item, ...opts.item });
        if (typeof cb === 'function') {
          cb(null, item);
        }
      } catch (e: any) {
        if (typeof cb === 'function') {
          cb(e.stack);
        }
      }
    });
    adminEndpoint('/systems/keywords', 'generic::deleteById', async (id, cb) => {
      if (typeof id === 'string') {
        await getRepository(Keyword).delete({ id });
      }
      cb(null);
    });
    adminEndpoint('/systems/keywords', 'generic::getAll', async (cb) => {
      try {
        const items = await getRepository(Keyword).find({
          relations: ['responses'],
          order:     { keyword: 'ASC' },
        });
        cb(null, items);
      } catch (e: any) {
        cb(e.stack, []);
      }
    });
    adminEndpoint('/systems/keywords', 'generic::getOne', async (id, cb) => {
      cb(null, await getRepository(Keyword).findOne({ where: { id: String(id) }, relations: ['responses'] }));
    });
  }

  @command('!keyword')
  @default_permission(defaultPermissions.CASTERS)
  @helper()
  public main(opts: CommandOptions): CommandResponse[] {
    let url = 'http://sogebot.github.io/sogeBot/#/systems/keywords';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogebot.github.io/sogeBot/#/_master/systems/keywords';
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
  @default_permission(defaultPermissions.CASTERS)
  public async add(opts: CommandOptions): Promise<(CommandResponse & { id: string | null })[]> {
    try {
      const [userlevel, stopIfExecuted, keywordRegex, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: defaultPermissions.VIEWERS })
        .argument({
          optional: true, name: 's', default: false, type: Boolean,
        })
        .argument({
          name: 'k', type: String, multi: true, delimiter: '',
        })
        .argument({
          name: 'r', type: String, multi: true, delimiter: '',
        })
        .toArray();

      const kDb = await getRepository(Keyword).findOne({
        relations: ['responses'],
        where:     { keyword: keywordRegex },
      });
      if (!kDb) {
        await getRepository(Keyword).save({ keyword: keywordRegex, enabled: true });
        return this.add(opts);
      }

      const pItem = await get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      await getRepository(Keyword).save({
        ...kDb,
        responses: [...kDb.responses, {
          order:          kDb.responses.length,
          permission:     pItem.id ?? defaultPermissions.VIEWERS,
          stopIfExecuted: stopIfExecuted,
          response:       response,
          filter:         '',
        }],
      });
      return [{
        response: prepare('keywords.keyword-was-added', kDb), ...opts, id: kDb.id,
      }];
    } catch (e: any) {
      error(e.stack);
      return [{
        response: prepare('keywords.keyword-parse-failed'), ...opts, id: null,
      }];
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
  @default_permission(defaultPermissions.CASTERS)
  public async edit(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [userlevel, stopIfExecuted, keywordRegexOrUUID, rId, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: defaultPermissions.VIEWERS })
        .argument({
          optional: true, name: 's', default: null, type: Boolean,
        })
        .argument({
          name: 'k', type: String, multi: true, delimiter: '',
        })
        .argument({ name: 'rid', type: Number })
        .argument({
          name: 'r', type: String, multi: true, delimiter: '',
        })
        .toArray();

      let keywords: Required<KeywordInterface>[] = [];
      if (isUUID(keywordRegexOrUUID)) {
        keywords = await getRepository(Keyword).find({ where: { id: keywordRegexOrUUID }, relations: ['responses'] });
      } else {
        keywords = await getRepository(Keyword).find({ where: { keyword: keywordRegexOrUUID }, relations: ['responses'] });
      }

      if (keywords.length === 0) {
        return [{ response: prepare('keywords.keyword-was-not-found'), ...opts }];
      } else if (keywords.length > 1) {
        return [{ response: prepare('keywords.keyword-is-ambiguous'), ...opts }];
      } else {
        const keyword = keywords[0];
        const responseDb = keyword.responses.find(o => o.order === (rId - 1));
        if (!responseDb) {
          return [{ response: prepare('keywords.response-was-not-found', { keyword: keyword.keyword, response: rId }), ...opts }];
        }

        const pItem = await get(userlevel);
        if (!pItem) {
          throw Error('Permission ' + userlevel + ' not found.');
        }

        responseDb.response = response;
        responseDb.permission = pItem.id ?? defaultPermissions.VIEWERS;
        if (stopIfExecuted) {
          responseDb.stopIfExecuted = stopIfExecuted;
        }
        await getRepository(Keyword).save(keyword);
        return [{ response: prepare('keywords.keyword-was-edited', { keyword: keyword.keyword, response }), ...opts }];
      }
    } catch (e: any) {
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
  @default_permission(defaultPermissions.CASTERS)
  public async list(opts: CommandOptions): Promise<CommandResponse[]> {
    const keyword = new Expects(opts.parameters).everything({ optional: true }).toArray()[0];
    if (!keyword) {
      // print keywords
      const keywords = await getRepository(Keyword).find({ where: { enabled: true } });
      const response = (keywords.length === 0 ? translate('keywords.list-is-empty') : translate('keywords.list-is-not-empty').replace(/\$list/g, _.orderBy(keywords, 'keyword').map(o => o.keyword).join(', ')));
      return [{ response, ...opts }];
    } else {
      // print responses
      const keyword_with_responses
        = await getRepository(Keyword).findOne({
          relations: ['responses'],
          where:     isUUID(keyword) ? { id: keyword } : { keyword },
        });

      if (!keyword_with_responses || keyword_with_responses.responses.length === 0) {
        return [{ response: prepare('keywords.list-of-responses-is-empty', { keyword: keyword_with_responses?.keyword || keyword }), ...opts }];
      }
      return Promise.all(_.orderBy(keyword_with_responses.responses, 'order', 'asc').map(async(r) => {
        const perm = r.permission ? await get(r.permission) : { name: '-- unset --' };
        const response = prepare('keywords.response', {
          keyword: keyword_with_responses.keyword, index: ++r.order, response: r.response, after: r.stopIfExecuted ? '_' : 'v', permission: perm?.name ?? 'n/a',
        });
        return { response, ...opts };
      }));
    }
  }

  /**
   * Remove keyword
   *
   * format: !keyword edit -k [uuid|regexp]
   * @param {CommandOptions} opts - options
   * @return {Promise<CommandResponse[]>}
   */
  @command('!keyword remove')
  @default_permission(defaultPermissions.CASTERS)
  public async remove(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [keywordRegexOrUUID, rId]
        = new Expects(opts.parameters)
          .argument({
            name: 'k', optional: false, multi: true, delimiter: '',
          })
          .argument({
            name: 'rid', optional: true, type: Number,
          })
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
        const keyword = keywords[0];
        if (rId) {
          const responseDb = keyword.responses.find(o => o.order === (rId - 1));
          if (!responseDb) {
            return [{ response: prepare('keywords.response-was-not-found'), ...opts }];
          }
          // remove and reorder
          const responses = [];
          for (let i = 0; i < keyword.responses.length; i++) {
            if (responseDb.id !== _.orderBy(keyword.responses, 'order', 'asc')[i].id) {
              responses.push({
                ..._.orderBy(keyword.responses, 'order', 'asc')[i],
                order: responses.length,
              });
            }
          }
          await getRepository(Keyword).save({ ...keyword, responses });
          return [{ response: prepare('keywords.response-was-removed', keyword), ...opts }];
        } else {
          await getRepository(Keyword).remove(keyword);
          return [{ response: prepare('keywords.keyword-was-removed', keyword), ...opts }];
        }
      }
    } catch (e: any) {
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
  @default_permission(defaultPermissions.CASTERS)
  public async toggle(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [keywordRegexOrUUID]
        = new Expects(opts.parameters)
          .argument({
            name: 'k', optional: false, multi: true, delimiter: '',
          })
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
    } catch (e: any) {
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
  @timer()
  @parser({ fireAndForget: true })
  public async run(opts: ParserOptions) {
    if (!opts.sender || opts.message.trim().startsWith('!')) {
      return true;
    }

    const keywords = (await getRepository(Keyword).find({ relations: ['responses'] })).filter((o) => {
      const regexp = `([!"#$%&'()*+,-.\\/:;<=>?\\b\\s]${o.keyword}[!"#$%&'()*+,-.\\/:;<=>?\\b\\s])|(^${o.keyword}[!"#$%&'()*+,-.\\/:;<=>?\\b\\s])|([!"#$%&'()*+,-.\\/:;<=>?\\b\\s]${o.keyword}$)|(^${o.keyword}$)`;
      const isFoundInMessage = XRegExp(regexp, 'giu').test(opts.message);
      const isEnabled = o.enabled;
      debug('keywords.run', `\n\t<\t${opts.message}\n\t?\t${o.keyword}\n\t-\tisFoundInMessage: ${isFoundInMessage}, isEnabled: ${isEnabled}\n\t-\t${regexp}`);
      if (isFoundInMessage && !isEnabled) {
        warning(`Keyword ${o.keyword} (${o.id}) is disabled!`);
      }
      return isFoundInMessage && isEnabled;
    });

    let atLeastOnePermissionOk = false;
    for (const k of keywords) {
      const _responses: KeywordsResponsesInterface[] = [];

      // check group filter first
      let group: Readonly<Required<KeywordGroupInterface>> | undefined;
      let groupPermission: null | string = null;
      if (k.group) {
        group = await getRepository(KeywordGroup).findOne({ name: k.group });
        if (group) {
          if (group.options.filter && !(await checkFilter(opts, group.options.filter))) {
            warning(`Keyword ${k.keyword}#${k.id} didn't pass group filter.`);
            continue;
          }
          groupPermission = group.options.permission;
        }
      }

      for (const r of _.orderBy(k.responses, 'order', 'asc')) {
        let permission = r.permission ?? groupPermission;
        // show warning if null permission
        if (!permission) {
          permission = defaultPermissions.CASTERS;
          warning(`Keyword ${k.keyword}#${k.id}|${r.order} doesn't have any permission set, treating as CASTERS permission.`);
        }
        if (typeof getFromViewersCache(opts.sender.userId, permission) === 'undefined') {
          addToViewersCache(opts.sender.userId, permission, (await check(opts.sender.userId, permission, false)).access);
        }

        if (getFromViewersCache(opts.sender.userId, permission)
          && (r.filter.length === 0 || (r.filter.length > 0 && await checkFilter(opts, r.filter)))) {
          _responses.push(r);
          atLeastOnePermissionOk = true;
          if (r.stopIfExecuted) {
            break;
          }
        }
      }

      this.sendResponse(_.cloneDeep(_responses), { sender: opts.sender, discord: opts.discord, id: opts.id });
    }

    return atLeastOnePermissionOk;
  }

  async sendResponse(responses: (KeywordsResponsesInterface)[], opts: { sender: CommandOptions['sender'], discord: CommandOptions['discord'], id: string }) {
    for (let i = 0; i < responses.length; i++) {
      await parserReply(responses[i].response, opts);
    }
  }
}

export default new Keywords();