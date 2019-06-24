import _ from 'lodash';
import XRegExp from 'xregexp';
import safeEval from 'safe-eval';

import { command, default_permission, helper } from '../decorators';
import { permission } from '../permissions';
import System from './_interface';
import constants from '../constants';
import { parser } from '../decorators';
import Expects from '../expects';
import { sendMessage, prepare, message, getOwner, isModerator, isSubscriber, isVIP, isBroadcaster, isBot, isOwner } from '../commons';
import { getCountOfCommandUsage, incrementCountOfCommandUsage, resetCountOfCommandUsage } from '../helpers/commands/count';

/*
 * !command                                                                 - gets an info about command usage
 * !command add (-p [uuid|name]) ?-s true|false ![cmd] [response]           - add command with specified response
 * !command edit (-p [uuid|name]) ?-s true|false ![cmd] [number] [response] - edit command with specified response
 * !command remove ![cmd]                                                   - remove specified command
 * !command remove ![cmd] [number]                                          - remove specified response of command
 * !command toggle ![cmd]                                                   - enable/disable specified command
 * !command toggle-visibility ![cmd]                                        - enable/disable specified command
 * !command list                                                            - get commands list
 * !command list ![cmd]                                                     - get responses of command
 */

interface Response {
  _id?: string;
  order: number;
  response: string;
  stopIfExecuted: boolean;
  permission: string;
  filter: string;
};

interface Command {
  _id?: string;
  command: string;
  enabled: boolean;
  visible: boolean;
  responses?: Response[];
  count?: number;
};

class CustomCommands extends System {
  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'customcommands', id: 'customcommands/list' });
  }

  sockets () {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }

    this.socket.on('connection', (socket) => {
      socket.on('find.commands', async (opts, cb) => {
        opts.collection = opts.collection || 'data';
        if (opts.collection.startsWith('_')) {
          opts.collection = opts.collection.replace('_', '');
        } else {opts.collection = this.collection[opts.collection];}

        opts.where = opts.where || {};

        let items: Command[] = await global.db.engine.find(opts.collection, opts.where);
        for (let i of items) {
          i.count = await getCountOfCommandUsage(i.command);
          i.responses = await global.db.engine.find(this.collection.responses, { cid: String(i._id) });
        }
        if (_.isFunction(cb)) {cb(null, items);}
      });
      socket.on('findOne.command', async (opts, cb) => {
        opts.collection = opts.collection || 'data';
        if (opts.collection.startsWith('_')) {
          opts.collection = opts.collection.replace('_', '');
        } else {opts.collection = this.collection[opts.collection];}

        opts.where = opts.where || {};

        let item: Command = await global.db.engine.findOne(opts.collection, opts.where);
        item.count = await getCountOfCommandUsage(item.command);
        item.responses = await global.db.engine.find(this.collection.responses, { cid: String(item._id) });
        if (_.isFunction(cb)) {cb(null, item);}
      });
      socket.on('update.command', async (opts, cb) => {
        opts.collection = opts.collection || 'data';
        if (opts.collection.startsWith('_')) {
          opts.collection = opts.collection.replace('_', '');
        } else {opts.collection = this.collection[opts.collection];}

        if (opts.items) {
          for (let item of opts.items) {
            const _id = item._id; delete item._id;
            const count = item.count; delete item.count;
            const responses = item.responses; delete item.responses;

            let itemFromDb = item;
            if (_.isNil(_id)) {itemFromDb = await global.db.engine.insert(opts.collection, item);}
            else {await global.db.engine.update(opts.collection, { _id }, item);}

            // set command count
            const cCount = await getCountOfCommandUsage(itemFromDb.command);
            if (count !== cCount && count === 0) {
              // we assume its always reset (set to 0)
              await resetCountOfCommandUsage(itemFromDb.command);
            }

            // update responses
            let rIds: any[] = [];
            for (let r of responses) {
              if (!r.cid) {r.cid = _id || String(itemFromDb._id);}

              if (!r._id) {
                rIds.push(
                  String((await global.db.engine.insert(this.collection.responses, r))._id)
                );
              } else {
                const _id = String(r._id); delete r._id;
                rIds.push(_id);
                await global.db.engine.update(this.collection.responses, { _id }, r);
              }
            }

            itemFromDb._id = _id || String(itemFromDb._id);

            // remove responses
            for (let r of await global.db.engine.find(this.collection.responses, { cid: itemFromDb._id })) {
              if (!rIds.includes(String(r._id))) {await global.db.engine.remove(this.collection.responses, { _id: String(r._id) });}
            }

            if (_.isFunction(cb)) {
              cb(null, {
                command: itemFromDb,
                responses: await global.db.engine.find(this.collection.responses, { cid: itemFromDb._id })
              });
            }
          }
        } else {
          if (_.isFunction(cb)) {cb(null, []);}
        }
      });
    });
  }

  @command('!command')
  @default_permission(permission.CASTERS)
  @helper()
  main (opts: CommandOptions) {
    sendMessage(global.translate('core.usage') + ': !command add (-p [uuid|name]) (-s=true|false) <!cmd> <response> | !command edit (-p [uuid|name]) (-s=true|false) <!cmd> <number> <response> | !command remove <!command> | !command remove <!command> <number> | !command list | !command list <!command>', opts.sender, opts.attr);
  }

  @command('!command edit')
  @default_permission(permission.CASTERS)
  async edit (opts: CommandOptions) {
    try {
      const [userlevel, stopIfExecuted, command, rId, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ optional: true, name: 's', default: null, type: Boolean })
        .argument({ name: 'c', type: String, multi: true, delimiter: '' })
        .argument({ name: 'rid', type: Number })
        .argument({ name: 'r', type: String, multi: true, delimiter: '' })
        .toArray();

      if (!command.startsWith('!')) {
        throw Error('Command should start with !');
      }

      let cDb = await global.db.engine.findOne(this.collection.data, { command });
      if (!cDb._id) {return sendMessage(prepare('customcmds.command-was-not-found', { command }), opts.sender, opts.attr);}

      let rDb = await global.db.engine.findOne(this.collection.responses, { cid: String(cDb._id), order: rId - 1 });
      if (!rDb._id) {return sendMessage(prepare('customcmds.response-was-not-found', { command, response: rId }), opts.sender, opts.attr);}


      const pItem: Permissions.Item | null = await global.permissions.get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      const _id = rDb._id; delete rDb._id;
      rDb.response = response;
      rDb.permission = pItem.id;
      if (stopIfExecuted) {rDb.stopIfExecuted = stopIfExecuted;}

      await global.db.engine.update(this.collection.responses, { _id }, rDb);
      sendMessage(prepare('customcmds.command-was-edited', { command, response }), opts.sender, opts.attr);
    } catch (e) {
      sendMessage(prepare('customcmds.commands-parse-failed'), opts.sender, opts.attr);
    }
  }

  @command('!command add')
  @default_permission(permission.CASTERS)
  async add (opts: CommandOptions) {
    try {
      const [userlevel, stopIfExecuted, command, response] = new Expects(opts.parameters)
        .permission({ optional: true, default: permission.VIEWERS })
        .argument({ optional: true, name: 's', default: false, type: Boolean })
        .argument({ name: 'c', type: String, multi: true, delimiter: '' })
        .argument({ name: 'r', type: String, multi: true, delimiter: '' })
        .toArray();

      if (!command.startsWith('!')) {
        throw Error('Command should start with !');
      }

      let cDb = await global.db.engine.findOne(this.collection.data, { command });
      if (!cDb._id) {
        cDb = await global.db.engine.insert(this.collection.data, {
          command, enabled: true, visible: true
        });
      }

      const pItem: Permissions.Item | null = await global.permissions.get(userlevel);
      if (!pItem) {
        throw Error('Permission ' + userlevel + ' not found.');
      }

      let rDb = await global.db.engine.find(this.collection.responses, { cid: String(cDb._id) });
      await global.db.engine.insert(this.collection.responses, {
        cid: String(cDb._id),
        order: rDb.length,
        permission: pItem.id,
        stopIfExecuted,
        response
      });
      sendMessage(prepare('customcmds.command-was-added', { command }), opts.sender, opts.attr);
    } catch (e) {
      sendMessage(prepare('customcmds.commands-parse-failed'), opts.sender, opts.attr);
    }
  }

  @parser({ priority: constants.LOW })
  async run (opts: ParserOptions) {
    if (!opts.message.startsWith('!')) {return true;} // do nothing if it is not a command
    let _responses: Response[] = [];
    var command: any = {};
    let cmdArray = opts.message.toLowerCase().split(' ');
    for (let i = 0, len = opts.message.toLowerCase().split(' ').length; i < len; i++) {
      command = await global.db.engine.findOne(this.collection.data, { command: cmdArray.join(' '), enabled: true });
      if (!_.isEmpty(command)) {break;}
      cmdArray.pop(); // remove last array item if not found
    }
    if (Object.keys(command).length === 0) {return true;} // no command was found - return

    // remove found command from message to get param
    const param = opts.message.replace(new RegExp('^(' + cmdArray.join(' ') + ')', 'i'), '').trim();
    const count = await incrementCountOfCommandUsage(command.command);

    const responses: Response[] = await global.db.engine.find(this.collection.responses, { cid: String(command._id) });
    let atLeastOnePermissionOk = false;
    for (let r of _.orderBy(responses, 'order', 'asc')) {
      if ((await global.permissions.check(opts.sender.userId, r.permission)).access
          && await this.checkFilter(opts, r.filter)) {
        _responses.push(r);
        atLeastOnePermissionOk = true;
        if (r.stopIfExecuted) {
          break;
        }
      }
    }
    this.sendResponse(_.cloneDeep(_responses), { param, sender: opts.sender, command: command.command, count });
    return atLeastOnePermissionOk;
  }

  async sendResponse(responses, opts) {
    if (responses.length === 0) {return;}
    const response = responses.shift();

    await sendMessage(response.response, opts.sender, {
      param: opts.param,
      cmd: opts.command,
    });
    setTimeout(() => {
      this.sendResponse(responses, opts);
    }, 300);
  }

  @command('!command list')
  @default_permission(permission.CASTERS)
  async list (opts: CommandOptions) {
    const command = new Expects(opts.parameters).command({ optional: true }).toArray()[0];

    if (!command) {
      // print commands
      let commands = await global.db.engine.find(this.collection.data, { visible: true, enabled: true });
      var output = (commands.length === 0 ? global.translate('customcmds.list-is-empty') : global.translate('customcmds.list-is-not-empty').replace(/\$list/g, _.map(_.orderBy(commands, 'command'), 'command').join(', ')));
      sendMessage(output, opts.sender, opts.attr);
    } else {
      // print responses
      const cid = String((await global.db.engine.findOne(this.collection.data, { command }))._id);
      const responses = _.orderBy((await global.db.engine.find(this.collection.responses, { cid })), 'order', 'asc');

      if (responses.length === 0) {sendMessage(prepare('customcmdustomcmds.list-of-responses-is-empty', { command }), opts.sender, opts.attr);}
      let permissions = (await global.db.engine.find(global.permissions.collection.data)).map((o) => {
        return {
          v: o.id, string: o.name
        };
      });
      for (let r of responses) {
        let rPrmsn: any = permissions.find(o => o.v === r.permission);
        const response = await prepare('customcmds.response', { command, index: ++r.order, response: r.response, after: r.stopIfExecuted ? '_' : 'v', permission: rPrmsn.string });
        global.log.chatOut(response, { username: opts.sender.username });
        message(global.tmi.sendWithMe ? 'me' : 'say', getOwner(), response);
      }
    }
  }

  async togglePermission (opts: CommandOptions) {
    const command = await global.db.engine.findOne(this.collection.data, { command: opts.parameters });
    if (!_.isEmpty(command)) {
      await global.db.engine.update(this.collection.data, { _id: command._id.toString() }, { permission: command.permission === 3 ? 0 : ++command.permission });
    }
  }

  @command('!command toggle')
  @default_permission(permission.CASTERS)
  async toggle (opts: CommandOptions) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP) as unknown as { [x: string]: string } | null;
    if (_.isNil(match)) {
      let message = await prepare('customcmds.commands-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const command = await global.db.engine.findOne(this.collection.data, { command: match.command });
    if (_.isEmpty(command)) {
      let message = await prepare('customcmds.command-was-not-found', { command: match.command });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await global.db.engine.update(this.collection.data, { command: match.command }, { enabled: !command.enabled });

    let message = await prepare(!command.enabled ? 'customcmds.command-was-enabled' : 'customcmds.command-was-disabled', { command: command.command });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!command toggle-visibility')
  @default_permission(permission.CASTERS)
  async toggleVisibility (opts: CommandOptions) {
    const match = XRegExp.exec(opts.parameters, constants.COMMAND_REGEXP) as unknown as { [x: string]: string } | null;
    if (_.isNil(match)) {
      let message = await prepare('customcmds.commands-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const command = await global.db.engine.findOne(this.collection.data, { command: match.command });
    if (_.isEmpty(command)) {
      let message = await prepare('customcmds.command-was-not-found', { command: match.command });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await global.db.engine.update(this.collection.data, { command: match.command }, { visible: !command.visible });
    let message = await prepare(!command.visible ? 'customcmds.command-was-exposed' : 'customcmds.command-was-concealed', { command: command.command });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!command remove')
  @default_permission(permission.CASTERS)
  async remove (opts: CommandOptions) {
    try {
      const [command, response] = new Expects(opts.parameters).command().number({ optional: true }).toArray();
      let cid = (await global.db.engine.findOne(this.collection.data, { command }))._id;
      if (!cid) {
        sendMessage(prepare('customcmds.command-was-not-found', { command }), opts.sender, opts.attr);
      } else {
        cid = String(cid);
        if (response) {
          const order = Number(response) - 1;
          let removed = await global.db.engine.remove(this.collection.responses, { cid, order });
          if (removed > 0) {
            sendMessage(prepare('customcmds.response-was-removed', { command, response }), opts.sender, opts.attr);

            // update order
            const responses = _.orderBy(await global.db.engine.find(this.collection.responses, { cid }), 'order', 'asc');
            if (responses.length === 0) {
              // remove command if 0 responses
              await global.db.engine.remove(this.collection.data, { command });
            }

            let order = 0;
            for (let r of responses) {
              const _id = String(r._id); delete r._id;
              r.order = order;
              await global.db.engine.update(this.collection.responses, { _id }, r);
              order++;
            }
          } else {sendMessage(prepare('customcmds.response-was-not-found', { command, response }), opts.sender, opts.attr);}
        } else {
          await global.db.engine.remove(this.collection.data, { command });
          sendMessage(prepare('customcmds.command-was-removed', { command }), opts.sender, opts.attr);
        }
      }
    } catch (e) {
      return sendMessage(prepare('customcmds.commands-parse-failed'), opts.sender, opts.attr);
    }
  }

  async checkFilter (opts: CommandOptions | ParserOptions, filter: string) {
    if (typeof filter === 'undefined' || filter.trim().length === 0) {return true;}
    let toEval = `(function evaluation () { return ${filter} })()`;

    let $userObject = await global.users.getByName(opts.sender.username);
    let $rank = null;
    if (global.systems.ranks.isEnabled()) {
      $rank = await global.systems.ranks.get($userObject);
    }

    const $is = {
      moderator: await isModerator(opts.sender.username),
      subscriber: await isSubscriber(opts.sender.username),
      vip: await isVIP(opts.sender.username),
      broadcaster: isBroadcaster(opts.sender.username),
      bot: isBot(opts.sender.username),
      owner: isOwner(opts.sender.username),
    };

    // get custom variables
    const customVariablesDb = await global.db.engine.find('custom.variables');
    const customVariables = {};
    for (const cvar of customVariablesDb) {
      customVariables[cvar.variableName] = cvar.currentValue;
    }

    const context = {
      _: _,
      $sender: opts.sender.username,
      $is,
      $rank,
      // add global variables
      $game: _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a'),
      $title: _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a'),
      $views: _.get(await global.db.engine.findOne('api.current', { key: 'views' }), 'value', 0),
      $followers: _.get(await global.db.engine.findOne('api.current', { key: 'followers' }), 'value', 0),
      $hosts: _.get(await global.db.engine.findOne('api.current', { key: 'hosts' }), 'value', 0),
      $subscribers: _.get(await global.db.engine.findOne('api.current', { key: 'subscribers' }), 'value', 0),
      ...customVariables
    };
    var result = false;
    try {
      result = safeEval(toEval, context);
    } catch (e) {
      // do nothing
    }
    delete context._;
    return !!result; // force boolean
  }
}

export default CustomCommands;
export { CustomCommands };
