import { Queue as QueueEntity, QueueInterface } from '@entity/queue.js';
import { z } from 'zod';

import System from './_interface.js';
import {
  command, default_permission, settings,
} from '../decorators.js';

import { parserReply } from '~/commons.js';
import { AppDataSource } from '~/database.js';
import { Get, Post } from '~/decorators/endpoint.js';
import { getUserSender, prepare } from '~/helpers/commons/index.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import * as changelog from '~/helpers/user/changelog.js';
import getBotId from '~/helpers/user/getBotId.js';
import getBotUserName from '~/helpers/user/getBotUserName.js';
import twitch from '~/services/twitch.js';
import { translate } from '~/translations.js';

/*
 * !queue                            - gets an info whether queue is opened or closed
 * !queue open                       - open a queue
 * !queue close                      - close a queue
 * !queue pick [amount]              - pick [amount] (optional) of users from queue
 * !queue random [amount]            - random [amount] (optional) of users from queue
 * !queue join [optional-message]    - join a queue
 * !queue clear                      - clear a queue
 * !queue list                       - current list of queue
 */
class Queue extends System {
  locked = false;

  @settings('eligibility')
  eligibilityAll = true;
  @settings('eligibility')
  eligibilitySubscribers = false;

  pickedUsers: QueueInterface[] = [];

  ///////////////////////// <! API endpoints
  @Get('/')
  async getAll(req: any) {
    const action = req.query._action;
    if (action === 'picked') {
      return this.pickedUsers;
    }
    return AppDataSource.getRepository(QueueEntity).find();
  }
  @Post('/', {
    zodValidator: z.object({
      username: z.string().min(2).optional(),
      count:    z.number().int(),
      random:   z.boolean(),
    }),
  })
  async postAction(req: any) {
    const action = req.query._action;
    if (action === 'clear') {
      await AppDataSource.getRepository(QueueEntity).clear();
      return;
    }
    if (action === 'pick') {
      const data = req.body;
      if (data.username) {
        const users: any[] = [];
        if (typeof data.username === 'string') {
          data.username = [data.username];
        }
        for (const user of data.username) {
          const entity = await AppDataSource.getRepository(QueueEntity).findOneBy({ username: user });
          if (entity) {
            users.push(entity);
          }
        }
        const opts = {
          sender: getUserSender(getBotId(), getBotUserName()), users, attr: {}, createdAt: Date.now(), command: '', parameters: '', isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
        };
        const picked = await this.pickUsers(opts, data.random);
        for (let i = 0; i < picked.responses.length; i++) {
          await parserReply(picked.responses[i].response, { sender: picked.responses[i].sender, discord: picked.responses[i].discord, attr: picked.responses[i].attr, id: '' });
        }
        return picked.users;
      } else {
        const opts = {
          sender: getUserSender(getBotId(), getBotUserName()), attr: {}, createdAt: Date.now(), command: '', parameters: String(data.count), isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
        };
        const picked = await this.pickUsers(opts, data.random);
        for (let i = 0; i < picked.responses.length; i++) {
          await parserReply(picked.responses[i].response, { sender: picked.responses[i].sender, discord: picked.responses[i].discord, attr: picked.responses[i].attr, id: '' });
        }
        return picked.users;
      }
    }
  }
  ///////////////////////// API endpoints />

  async getUsers (opts: { random: boolean, amount: number }): Promise<QueueInterface[]> {
    opts = opts || { amount: 1 };
    let users = await AppDataSource.getRepository(QueueEntity).find();

    if (opts.random) {
      users = users.sort(() => Math.random());
    } else {
      users = users.sort(o => -(new Date(o.createdAt).getTime()));
    }

    const toReturn: QueueInterface[] = [];
    let i = 0;
    for (const user of users) {
      const isNotSubscriberEligible = !user.isSubscriber && (this.eligibilitySubscribers);
      if (isNotSubscriberEligible) {
        continue;
      }

      if (i < opts.amount) {
        await AppDataSource.getRepository(QueueEntity).remove(user);
        toReturn.push(user);
      } else {
        break;
      }
      i++;
    }
    return toReturn;
  }

  @command('!queue')
  main (opts: CommandOptions): CommandResponse[] {
    return [{ response: translate(this.locked ? 'queue.info.closed' : 'queue.info.opened'), ...opts }];
  }

  @command('!queue open')
  @default_permission(defaultPermissions.CASTERS)
  open (opts: CommandOptions): CommandResponse[] {
    this.locked = false;
    return [{ response: translate('queue.open'), ...opts }];
  }

  @command('!queue close')
  @default_permission(defaultPermissions.CASTERS)
  close (opts: CommandOptions): CommandResponse[] {
    this.locked = true;
    return [{ response: translate('queue.close'), ...opts }];
  }

  @command('!queue join')
  async join (opts: CommandOptions): Promise<CommandResponse[]> {
    if (!(this.locked)) {
      const user = await changelog.get(opts.sender.userId);
      if (!user) {
        changelog.update(opts.sender.userId, { userName: opts.sender.userName });
        return this.join(opts);
      }

      // get message
      const message = opts.parameters.length > 0 ? opts.parameters : null;

      let eligible = false;
      if (!this.eligibilityAll) {
        if (this.eligibilitySubscribers && user.isSubscriber) {
          eligible = true;
        }
      } else {
        eligible = true;
      }

      if (eligible) {
        await AppDataSource.getRepository(QueueEntity).save({
          ...(await AppDataSource.getRepository(QueueEntity).findOneBy({ username: opts.sender.userName })),
          username:     opts.sender.userName,
          isSubscriber: user.isSubscriber,
          isModerator:  user.isModerator,
          createdAt:    Date.now(),
          message,

        });
        return [{ response: translate('queue.join.opened'), ...opts }];
      } else {
        return [];
      }
    } else {
      return [{ response: translate('queue.join.closed'), ...opts }];
    }
  }

  @command('!queue clear')
  @default_permission(defaultPermissions.CASTERS)
  clear (opts: CommandOptions): CommandResponse[] {
    AppDataSource.getRepository(QueueEntity).delete({});
    this.pickedUsers = [];
    return [{ response: translate('queue.clear'), ...opts }];
  }

  @command('!queue random')
  @default_permission(defaultPermissions.CASTERS)
  async random (opts: CommandOptions): Promise<CommandResponse[]> {
    return (await this.pickUsers(opts, false)).responses;
  }

  @command('!queue pick')
  @default_permission(defaultPermissions.CASTERS)
  async pick (opts: CommandOptions): Promise<CommandResponse[]> {
    return (await this.pickUsers(opts, false)).responses;
  }

  async pickUsers (opts: CommandOptions & { users?: QueueInterface[] }, random: boolean): Promise<{ users: QueueInterface[]; responses: CommandResponse[]}> {
    let users: QueueInterface[] = [];
    if (!opts.users) {
      const match = opts.parameters.match(/^(\d+)?/);
      if (match) {
        const input = match[0];
        const amount = (input === '' ? 1 : parseInt(input, 10));
        users = await this.getUsers({ amount, random });
      }
    } else {
      users = opts.users;
      for (const user of users) {
        await AppDataSource.getRepository(QueueEntity).delete({ username: user.username });
      }
    }

    this.pickedUsers = [];
    for (const user of users) {
      this.pickedUsers.push(user);
    }

    const atUsername = twitch.showWithAt;

    let msg;
    switch (users.length) {
      case 0:
        msg = translate('queue.picked.none');
        break;
      case 1:
        msg = translate('queue.picked.single');
        break;
      default:
        msg = translate('queue.picked.multi');
    }

    const response = msg.replace(/\$users/g, users.map(o => {
      const user = o.message ? `${o.username} - ${o.message}` : o.username;
      return atUsername ? `@${user}` : user;
    }).join(', '));
    return {
      users,
      responses: [{ response, ...opts }],
    };
  }

  @command('!queue list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions): Promise<CommandResponse[]> {
    const [atUsername, users] = await Promise.all([
      twitch.showWithAt,
      AppDataSource.getRepository(QueueEntity).find(),
    ]);
    const queueList = users.map(o => atUsername ? `@${o.username}` : o).join(', ');
    return [{ response: prepare('queue.list', { users: queueList }), ...opts }];
  }
}

export default new Queue();
