import Widget from './_interface.js';
import { parserReply } from '../commons.js';
import { QuickAction as QuickActionEntity, QuickActions } from '../database/entity/dashboard.js';
import { Randomizer } from '../database/entity/randomizer.js';
import { getUserSender } from '../helpers/commons/index.js';
import { setValueOf } from '../helpers/customvariables/index.js';
import { info } from '../helpers/log.js';

import { AppDataSource } from '~/database.js';
import { Delete, Get, Post } from '~/decorators/endpoint.js';

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
  @Get('/')
  getAll(req: any) {
    return AppDataSource.getRepository(QuickActionEntity).findBy({ userId: req.headers.authUser.userId });
  }

  @Delete('/:id')
  async deleteOne(req: any) {
    const it = await AppDataSource.getRepository(QuickActionEntity).delete({ id: req.params.id, userId: req.headers.authUser.userId });
    if (it.affected === 0) {
      throw new Error();
    }
  }

  @Post('/')
  saveOne(req: any) {
    return AppDataSource.getRepository(QuickActionEntity).save(req.body);
  }

  @Post('/:id', { action: 'trigger' })
  async trigger(req: any) {
    const item = await AppDataSource.getRepository(QuickActionEntity).findOneByOrFail({ id: req.params.id, userId: req.headers.authUser.userId });
    trigger(item, { userId: req.headers.authUser.userId, userName: req.headers.authUser.userName }, req.body.value);
  }
}

export default new QuickAction();
