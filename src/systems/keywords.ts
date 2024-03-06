import { randomUUID } from 'node:crypto';

import {
  Keyword, KeywordGroup,
} from '@entity/keyword.js';
import _, { orderBy, shuffle } from 'lodash-es';
import XRegExp from 'xregexp';

import System from './_interface.js';
import { parserReply } from '../commons.js';
import {
  command, default_permission, helper, parser, timer,
} from '../decorators.js';
import { Expects } from  '../expects.js';

import { checkFilter } from '~/helpers/checkFilter.js';
import { isUUID, prepare } from '~/helpers/commons/index.js';
import {
  debug, error, warning,
} from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';
import { check } from '~/helpers/permissions/check.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { get } from '~/helpers/permissions/get.js';
import { adminMiddleware } from '~/socket.js';
import { translate } from '~/translate.js';

class Keywords extends System {
  constructor() {
    super();
    this.addMenu({
      category: 'commands', name: 'keywords', id: 'commands/keywords', this: this,
    });
  }

  sockets () {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/keywords', adminMiddleware, async (req, res) => {
      res.send({
        data: await Keyword.find(),
      });
    });
    app.get('/api/systems/keywords/groups/', adminMiddleware, async (req, res) => {
      let [ groupsList, items ] = await Promise.all([
        KeywordGroup.find(), Keyword.find(),
      ]);

      for (const item of items) {
        if (item.group && !groupsList.find(o => o.name === item.group)) {
          // we dont have any group options -> create temporary group
          const group = new KeywordGroup();
          group.name = item.group;
          group.options = {
            filter:     null,
            permission: null,
          };
          groupsList = [
            ...groupsList,
            group,
          ];
        }
      }
      res.send({
        data: groupsList,
      });
    });
    app.get('/api/systems/keywords/:id', adminMiddleware, async (req, res) => {
      res.send({
        data: await Keyword.findOne({ where: { id: req.params.id } }),
      });
    });
    app.delete('/api/systems/keywords/groups/:name', adminMiddleware, async (req, res) => {
      await KeywordGroup.delete({ name: req.params.name });
      res.status(404).send();
    });
    app.delete('/api/systems/keywords/:id', adminMiddleware, async (req, res) => {
      await Keyword.delete({ id: req.params.id });
      res.status(404).send();
    });
    app.post('/api/systems/keywords/group', adminMiddleware, async (req, res) => {
      try {
        res.send({ data: await KeywordGroup.create(req.body).save() });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
    });
    app.post('/api/systems/keywords', adminMiddleware, async (req, res) => {
      try {
        const itemToSave = await Keyword.create(req.body).save();
        res.send({ data: itemToSave });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
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

      let kDb = await Keyword.findOne({
        where: { keyword: keywordRegex },
      });
      if (!kDb) {
        kDb = new Keyword();
        kDb.keyword = keywordRegex;
        kDb.enabled = true;
        await kDb.save();
        return this.add(opts);
      }

      const pItem = await get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      kDb.responses.push({
        id:             randomUUID(),
        order:          kDb.responses.length,
        permission:     pItem.id ?? defaultPermissions.VIEWERS,
        stopIfExecuted: stopIfExecuted,
        response:       response,
        filter:         '',
      });

      await kDb.save();
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

      let keywords: Required<Keyword>[] = [];
      if (isUUID(keywordRegexOrUUID)) {
        keywords = await Keyword.find({ where: { id: keywordRegexOrUUID } });
      } else {
        keywords = await Keyword.find({ where: { keyword: keywordRegexOrUUID } });
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
        await keyword.save();
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
      const keywords = await Keyword.find({ where: { enabled: true } });
      const response = (keywords.length === 0 ? translate('keywords.list-is-empty') : translate('keywords.list-is-not-empty').replace(/\$list/g, _.orderBy(keywords, 'keyword').map(o => o.keyword).join(', ')));
      return [{ response, ...opts }];
    } else {
      // print responses
      const keyword_with_responses
        = await Keyword.findOne({
          where: isUUID(keyword) ? { id: keyword } : { keyword },
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

      let keywords: Required<Keyword>[] = [];
      if (isUUID(keywordRegexOrUUID)) {
        keywords = await Keyword.find({ where: { id: keywordRegexOrUUID } });
      } else {
        keywords = await Keyword.find({ where: { keyword: keywordRegexOrUUID } });
      }

      if (keywords.length === 0) {
        return [{ response: prepare('keywords.keyword-was-not-found'), ...opts }];
      } else if (keywords.length > 1) {
        return [{ response: prepare('keywords.keyword-is-ambiguous'), ...opts }];
      } else {
        const keyword = keywords[0];
        let response = prepare('keywords.keyword-was-removed', keyword);
        if (rId >= 1) {
          const responseDb = keyword.responses.filter(o => o.order !== (rId - 1));

          // reorder
          responseDb.forEach((item, index) => {
            item.order = index;
          });

          await keyword.save();
          response = prepare('keywords.response-was-removed', { keyword, response: rId });
        } else {
          await keyword.remove();
        }
        return [{ response, ...opts }];

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

      let keywords: Required<Keyword>[] = [];
      if (isUUID(keywordRegexOrUUID)) {
        keywords = await Keyword.find({ where: { id: keywordRegexOrUUID } });
      } else {
        keywords = await Keyword.find({ where: { keyword: keywordRegexOrUUID } });
      }

      if (keywords.length === 0) {
        return [{ response: prepare('keywords.keyword-was-not-found'), ...opts }];
      } else if (keywords.length > 1) {
        return [{ response: prepare('keywords.keyword-is-ambiguous'), ...opts }];
      } else {
        keywords[0].enabled = !keywords[0].enabled;
        await keywords[0].save(); // we have only one keyword
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

    const keywords = (await Keyword.find()).filter((o) => {
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
      debug('keywords.run', JSON.stringify({ k }));
      const _responses: Keyword['responses'] = [];

      // check group filter first
      let group: Readonly<Required<KeywordGroup>> | null;
      let groupPermission: null | string = null;
      if (k.group) {
        group = await KeywordGroup.findOneBy({ name: k.group });
        debug('keywords.run', JSON.stringify({ group }));
        if (group) {
          if (group.options.filter && !(await checkFilter(opts, group.options.filter))) {
            warning(`Keyword ${k.keyword}#${k.id} didn't pass group filter.`);
            continue;
          }
          groupPermission = group.options.permission;
        }
      }

      const responses = k.areResponsesRandomized ? shuffle(k.responses) : orderBy(k.responses, 'order', 'asc');
      for (const r of responses) {
        let permission = r.permission ?? groupPermission;
        // show warning if null permission
        if (!permission) {
          permission = defaultPermissions.CASTERS;
          warning(`Keyword ${k.keyword}#${k.id}|${r.order} doesn't have any permission set, treating as CASTERS permission.`);
        }

        if ((await check(opts.sender.userId, permission, false)).access
          && (r.filter.length === 0 || (r.filter.length > 0 && await checkFilter(opts, r.filter)))) {
          _responses.push(r);
          atLeastOnePermissionOk = true;
          if (r.stopIfExecuted) {
            break;
          }
        }
      }

      debug('keywords.run', JSON.stringify({ _responses }));

      this.sendResponse(_.cloneDeep(_responses), { sender: opts.sender, discord: opts.discord, id: opts.id });
    }

    return atLeastOnePermissionOk;
  }

  async sendResponse(responses: (Keyword['responses']), opts: { sender: CommandOptions['sender'], discord: CommandOptions['discord'], id: string }) {
    for (let i = 0; i < responses.length; i++) {
      // check if response have new line, then split it and send it as separate messages
      for (const response of responses[i].response.split('\n')) {
        if (response.trim().length > 0) {
          await parserReply(response, opts);
        }
      }
    }
  }
}

export default new Keywords();