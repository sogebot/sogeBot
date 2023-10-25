import Widget from './_interface.js';
import { parserReply } from '../commons.js';
import { QuickAction as QuickActionEntity, QuickActions } from '../database/entity/dashboard.js';
import { Randomizer } from '../database/entity/randomizer.js';
import { getUserSender } from '../helpers/commons/index.js';
import { setValueOf } from '../helpers/customvariables/index.js';
import { info } from '../helpers/log.js';

import { AppDataSource } from '~/database.js';
import { adminEndpoint } from '~/helpers/socket.js';

const trigger = async (item: QuickActions.Item, user: { userId: string, userName: string }, value?: string) => {
  info(`Quick Action ${item.id} triggered by ${user.userName}#${user.userId}`);
  switch (item.type) {
    case 'randomizer': {
      AppDataSource.getRepository(Randomizer).update({ id: item.options.randomizerId }, { isShown: Boolean(value) ?? false });
      break;
    }
    case 'command': {
      const parser = new ((await import('../parser.js')).Parser)();
      const alias = (await import('../systems/alias.js')).default;
      const customcommands = (await import('../systems/customcommands.js')).default;

      const responses = await parser.command(getUserSender(user.userId, user.userName), item.options.command, true);
      for (let i = 0; i < responses.length; i++) {
        await parserReply(responses[i].response, { sender: responses[i].sender, discord: responses[i].discord, attr: responses[i].attr, id: '' });
      }

      if (customcommands.enabled) {
        await customcommands.run({
          sender: getUserSender(user.userId, user.userName), id: 'null', skip: true, quiet: false, message: item.options.command, parameters: item.options.command.trim().replace(/^(!\w+)/i, ''), parser: parser, isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined, isParserOptions: true,
        });
      }
      if (alias.enabled) {
        await alias.run({
          sender: getUserSender(user.userId, user.userName), id: 'null', skip: true, message: item.options.command, parameters: item.options.command.trim().replace(/^(!\w+)/i, ''), parser: parser, isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined, isParserOptions: true,
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
    adminEndpoint('/widgets/quickaction', 'generic::deleteById', async (id, cb) => {
      try {
        const item = await AppDataSource.getRepository(QuickActionEntity).findOneByOrFail({ id });
        await AppDataSource.getRepository(QuickActionEntity).remove(item);
        cb(null);
      } catch (e) {
        cb(e as Error);
      }
    });
    adminEndpoint('/widgets/quickaction', 'generic::save', async (item, cb) => {
      cb(null, await AppDataSource.getRepository(QuickActionEntity).save(item));
    });
    adminEndpoint('/widgets/quickaction', 'generic::getAll', async (userId, cb) => {
      const items = await AppDataSource.getRepository(QuickActionEntity).find({ where: { userId } });
      cb(null, items);
    });
    adminEndpoint('/widgets/quickaction', 'trigger', async ({ user, id, value }) => {
      const item = await AppDataSource.getRepository(QuickActionEntity).findOneByOrFail({ id, userId: user.userId });
      trigger(item, { userId: user.userId, userName: user.userName }, value);
    });
  }
}

export default new QuickAction();
