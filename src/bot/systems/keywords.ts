import * as _ from 'lodash';
import XRegExp from 'xregexp';

import { permission } from '../permissions';
import Message from '../message';
import * as constants from '../constants';
import { command, default_permission, parser } from '../decorators';
import System from './_interface';
import { sendMessage, prepare } from '../commons';

/*
 * !keyword                      - gets an info about keyword usage
 * !keyword add [kwd] [response] - add keyword with specified response
 * !keyword edit [kwd] [response] - add keyword with specified response
 * !keyword remove [kwd]         - remove specified keyword
 * !keyword toggle [kwd]         - enable/disable specified keyword
 * !keyword list                 - get keywords list
 */

class Keywords extends System {
  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'keywords', id: 'keywords/list' });
  }

  @command('!keyword edit')
  @default_permission(permission.CASTERS)
  async edit (opts) {
    const match = (XRegExp.exec(opts.parameters, constants.KEYWORD_REGEXP)) as unknown as { [x: string]: string } | null;

    if (_.isNil(match)) {
      let message = await prepare('keywords.keyword-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    let item = await global.db.engine.findOne(this.collection.data, { keyword: match.keyword });
    if (_.isEmpty(item)) {
      let message = await prepare('keywords.keyword-was-not-found', { keyword: match.keyword });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await global.db.engine.update(this.collection.data, { keyword: match.keyword }, { response: match.response });
    let message = await prepare('keywords.keyword-was-edited', { keyword: match.keyword, response: match.response });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!keyword')
  @default_permission(permission.CASTERS)
  main (opts) {
    sendMessage(global.translate('core.usage') + ': !keyword add <keyword> <response> | !keyword edit <keyword> <response> | !keyword remove <keyword> | !keyword list', opts.sender, opts.attr);
  }

  @command('!keyword add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    const match = XRegExp.exec(opts.parameters, constants.KEYWORD_REGEXP) as unknown as { [x: string]: string } | null;

    if (_.isNil(match)) {
      let message = await prepare('keywords.keyword-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    if (match.keyword.startsWith('!')) {match.keyword = match.keyword.replace('!', '');}
    let keyword = { keyword: match.keyword, response: match.response, enabled: true };

    if (!_.isEmpty(await global.db.engine.findOne(this.collection.data, { keyword: match.keyword }))) {
      let message = await prepare('keywords.keyword-already-exist', { keyword: match.keyword });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await global.db.engine.update(this.collection.data, { keyword: match.keyword }, keyword);
    let message = await prepare('keywords.keyword-was-added', { keyword: match.keyword });
    sendMessage(message, opts.sender, opts.attr);
  }

  @parser()
  async run (opts) {
    let keywords = await global.db.engine.find(this.collection.data);
    keywords = _.filter(keywords, function (o) {
      return opts.message.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0;
    });
    for (let keyword of keywords) {
      if (!keyword.enabled) {continue;}
      let message = await new Message(keyword.response).parse({ sender: opts.sender.username });
      sendMessage(message, opts.sender, opts.attr);
    }
    return true;
  }

  @command('!keyword list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    let keywords = await global.db.engine.find(this.collection.data);
    var output = (keywords.length === 0 ? global.translate('keywords.list-is-empty') : global.translate('keywords.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(keywords, 'keyword'), 'keyword').join(', ')));
    sendMessage(output, opts.sender, opts.attr);
  }

  @command('!keyword toggle')
  @default_permission(permission.CASTERS)
  async toggle (opts) {
    if (opts.parameters.trim().length === 0) {
      let message = await prepare('keywords.keyword-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }
    let id = opts.parameters.trim();

    const keyword = await global.db.engine.findOne(this.collection.data, { keyword: id });
    if (_.isEmpty(keyword)) {
      let message = await prepare('keywords.keyword-was-not-found', { keyword: id });
      sendMessage(message, opts.sender, opts.attr);
      return;
    }

    await global.db.engine.update(this.collection.data, { keyword: id }, { enabled: !keyword.enabled });

    let message = await prepare(!keyword.enabled ? 'keywords.keyword-was-enabled' : 'keywords.keyword-was-disabled', { keyword: keyword.keyword });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!keyword remove')
  @default_permission(permission.CASTERS)
  async remove (opts) {
    if (opts.parameters.trim().length === 0) {
      let message = await prepare('keywords.keyword-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }
    let id = opts.parameters.trim();

    let removed = await global.db.engine.remove(this.collection.data, { keyword: id });
    if (!removed) {
      let message = await prepare('keywords.keyword-was-not-found', { keyword: id });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }
    let message = await prepare('keywords.keyword-was-removed', { keyword: id });
    sendMessage(message, opts.sender, opts.attr);
  }
}

export default Keywords;
export { Keywords };