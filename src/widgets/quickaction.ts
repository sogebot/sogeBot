import { getRepository } from 'typeorm';

import { parserReply } from '../commons';
import { QuickAction as QuickActionEntity, QuickActions } from '../database/entity/dashboard';
import { getUserSender } from '../helpers/commons';
import { setValueOf } from '../helpers/customvariables';
import { info } from '../helpers/log';
import Widget from './_interface';

import { adminEndpoint } from '~/helpers/socket';

const trigger = async (item: QuickActions.Item, user: { userId: string, userName: string }, value?: string) => {
  info(`Quick Action ${item.id} triggered by ${user.userName}#${user.userId}`);
  switch (item.type) {
    case 'command': {
      const parser = new (require('../parser').default)();
      const alias = require('../systems/alias').default as typeof import('../systems/alias').default;
      const customcommands = require('../systems/customcommands').default as typeof import('../systems/customcommands').default;

      const responses = await parser.command(getUserSender(user.userId, user.userName), item.options.command, true);
      for (let i = 0; i < responses.length; i++) {
        await parserReply(responses[i].response, { sender: responses[i].sender, discord: responses[i].discord, attr: responses[i].attr, id: '' });
      }

      if (customcommands.enabled) {
        await customcommands.run({
          sender: getUserSender(user.userId, user.userName), id: 'null', skip: true, quiet: false, message: item.options.command, parameters: item.options.command.trim().replace(/^(!\w+)/i, ''), parser: parser, isAction: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined, isParserOptions: true,
        });
      }
      if (alias.enabled) {
        await alias.run({
          sender: getUserSender(user.userId, user.userName), id: 'null', skip: true, message: item.options.command, parameters: item.options.command.trim().replace(/^(!\w+)/i, ''), parser: parser, isAction: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined, isParserOptions: true,
        });
      }

      break;
    }
    case 'customvariable': {
      setValueOf(item.options.customvariable, value, {});
      break;
    }
  }
};

class QuickAction extends Widget {
  public sockets() {
    adminEndpoint('/widgets/quickaction', 'generic::getAll', async (userId, cb) => {
      const items = await getRepository(QuickActionEntity).find({ where: { userId } });
      cb(null, items);
    });
    adminEndpoint('/widgets/quickaction', 'trigger', async ({ user, id, value }) => {
      const item = await getRepository(QuickActionEntity).findOneOrFail({ where: { id, userId: user.userId } });
      trigger(item, { userId: user.userId, userName: user.userName }, value);
    });
  }
}

export default new QuickAction();
