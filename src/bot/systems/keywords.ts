import { get, isEmpty, isNil } from 'lodash';
import uuidv4 from 'uuid/v4';
import Expects from '../expects';
import { command, default_permission, parser } from '../decorators';
import { permission } from '../permissions';
import System from './_interface';
import { sendMessage, prepare } from '../commons';

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
    this.addMenu({ category: 'manage', name: 'keywords', id: 'keywords/list' });
  }

  @command('!keyword')
  @default_permission(permission.CASTERS)
  public main(opts) {
    let url = 'http://sogehige.github.io/sogeBot/#/commands/keywords';
    if (get(process, 'env.npm_package_version', 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogehige.github.io/sogeBot/#/_master/commands/keywords';
    }
    sendMessage(global.translate('core.usage') + ' => ' + url, opts.sender);
  }

  /**
   * Add new keyword
   *
   * format: !keyword add -k [regexp] -r [response]
   * @param {CommandOptions} opts - options
   */

  @command('!keyword add')
  @default_permission(permission.CASTERS)
  public async add(opts: CommandOptions) {
    try {
      const [keywordRegex, response] =
        new Expects(opts.parameters)
          .argument({ name: 'k', optional: false, multi: true, delimiter: '' })
          .argument({ name: 'r', optional: false, multi: true, delimiter: '' })
          .toArray();
      const data: Keyword = {
        id: uuidv4(),
        keyword: keywordRegex,
        response,
        enabled: true,
      };
      await global.db.engine.insert(this.collection.data, data);
      sendMessage(prepare('keywords.keyword-was-added', data), opts.sender);
    } catch (e) {
      sendMessage(prepare('keywords.keyword-parse-failed'), opts.sender);
    }
  }
/*
  async edit(opts) {
    const match = XRegExp.exec(opts.parameters, constants.KEYWORD_REGEXP)

    if (isNil(match)) {
      let message = await prepare('keywords.keyword-parse-failed')
      sendMessage(message, opts.sender)
      return false
    }

    let item = await global.db.engine.findOne(this.collection.data, { keyword: match.keyword })
    if (isEmpty(item)) {
      let message = await prepare('keywords.keyword-was-not-found', { keyword: match.keyword })
      sendMessage(message, opts.sender)
      return false
    }

    await global.db.engine.update(this.collection.data, { keyword: match.keyword }, { response: match.response })
    let message = await commons.prepare('keywords.keyword-was-edited', { keyword: match.keyword, response: match.response })
    commons.sendMessage(message, opts.sender)
  }

  async run(opts) {
    let keywords = await global.db.engine.find(this.collection.data)
    keywords = _.filter(keywords, function (o) {
      return opts.message.search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0
    })
    for (let keyword of keywords) {
      if (!keyword.enabled) continue
      let message = await new Message(keyword.response).parse({ sender: opts.sender.username })
      commons.sendMessage(message, opts.sender)
    }
    return true
  }

  async list(opts) {
    let keywords = await global.db.engine.find(this.collection.data)
    var output = (keywords.length === 0 ? global.translate('keywords.list-is-empty') : global.translate('keywords.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(keywords, 'keyword'), 'keyword').join(', ')))
    commons.sendMessage(output, opts.sender)
  }

  async toggle(opts) {
    if (opts.parameters.trim().length === 0) {
      let message = await commons.prepare('keywords.keyword-parse-failed')
      commons.sendMessage(message, opts.sender)
      return false
    }
    let id = opts.parameters.trim()

    const keyword = await global.db.engine.findOne(this.collection.data, { keyword: id })
    if (isEmpty(keyword)) {
      let message = await prepare('keywords.keyword-was-not-found', { keyword: id })
      sendMessage(message, opts.sender)
      return
    }

    await global.db.engine.update(this.collection.data, { keyword: id }, { enabled: !keyword.enabled })

    let message = await commons.prepare(!keyword.enabled ? 'keywords.keyword-was-enabled' : 'keywords.keyword-was-disabled', { keyword: keyword.keyword })
    commons.sendMessage(message, opts.sender)
  }

  async remove(opts) {
    if (opts.parameters.trim().length === 0) {
      let message = await commons.prepare('keywords.keyword-parse-failed')
      commons.sendMessage(message, opts.sender)
      return false
    }
    let id = opts.parameters.trim()

    let removed = await global.db.engine.remove(this.collection.data, { keyword: id })
    if (!removed) {
      let message = await commons.prepare('keywords.keyword-was-not-found', { keyword: id })
      commons.sendMessage(message, opts.sender)
      return false
    }
    let message = await commons.prepare('keywords.keyword-was-removed', { keyword: id })
    commons.sendMessage(message, opts.sender)
  }
  */
}

export default new Keywords();
