import { getRepository } from 'typeorm';

import { Queue as QueueEntity, QueueInterface } from '../database/entity/queue';
import { User } from '../database/entity/user';
import {
  command, default_permission, settings,
} from '../decorators';
import { getBotSender, prepare } from '../helpers/commons';
import { defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import tmi from '../tmi';
import { translate } from '../translate';
import System from './_interface';

/*
 * !queue                            - gets an info whether queue is opened or closed
 * !queue open                       - open a queue
 * !queue close                      - close a queue
 * !queue pick [amount]              - pick [amount] (optional) of users from queue
 * !queue random [amount]            - random [amount] (optional) of users from queue
 * !queue join                       - join a queue
 * !queue clear                      - clear a queue
 * !queue list                       - current list of queue
 */
class Queue extends System {
  locked = false;

  @settings('eligibility')
  eligibilityAll = true;
  @settings('eligibility')
  eligibilityFollowers = true;
  @settings('eligibility')
  eligibilitySubscribers = true;

  pickedUsers: QueueInterface[] = [];

  sockets () {
    adminEndpoint(this.nsp, 'queue::getAllPicked', async(cb) => {
      try {
        cb(null, this.pickedUsers);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'generic::getAll', async(cb) => {
      try {
        cb(
          null,
          await getRepository(QueueEntity).find(),
        );
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'queue::clear', async(cb) => {
      try {
        cb(
          null,
          await getRepository(QueueEntity).clear(),
        );
      } catch (e) {
        cb(e.stack);
      }
    });
    adminEndpoint(this.nsp, 'queue::pick', async (data, cb) => {
      try {
        if (data.username) {
          const users: any[] = [];
          if (typeof data.username === 'string') {
            data.username = [data.username];
          }
          for (let user of data.username) {
            user = await getRepository(QueueEntity).findOne({ username: user });
            users.push(user);
          }
          if (cb) {
            cb(null, (await this.pickUsers({
              sender: getBotSender(), users, attr: {}, createdAt: Date.now(), command: '', parameters: '',
            }, data.random)).users);
          }
        } else {
          if (cb) {
            cb(null, (await this.pickUsers({
              sender: getBotSender(), attr: {}, createdAt: Date.now(), command: '', parameters: String(data.count),
            }, data.random)).users);
          }
        }
      } catch (e) {
        if (cb) {
          cb(e.stack);
        }
      }
    });
  }

  async getUsers (opts: { random: boolean, amount: number }): Promise<QueueInterface[]> {
    opts = opts || { amount: 1 };
    let users = await getRepository(QueueEntity).find();

    if (opts.random) {
      users = users.sort(() => Math.random());
    } else {
      users = users.sort(o => -(new Date(o.createdAt).getTime()));
    }

    const toReturn: QueueInterface[] = [];
    let i = 0;
    for (const user of users) {
      const isNotFollowerEligible = !user.isFollower && (this.eligibilityFollowers);
      const isNotSubscriberEligible = !user.isSubscriber && (this.eligibilitySubscribers);
      if (isNotFollowerEligible && isNotSubscriberEligible) {
        continue;
      }

      if (i < opts.amount) {
        await getRepository(QueueEntity).remove(user);
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
      const user = await getRepository(User).findOne({ userId: opts.sender.userId });
      if (!user) {
        await getRepository(User).save({
          userId:   opts.sender.userId,
          username: opts.sender.username,
        });
        return this.join(opts);
      }
      const [all, followers, subscribers] = await Promise.all([this.eligibilityAll, this.eligibilityFollowers, this.eligibilitySubscribers]);

      let eligible = false;
      if (!all) {
        if ((followers && subscribers) && (user.isFollower || user.isSubscriber)) {
          eligible = true;
        } else if (followers && user.isFollower) {
          eligible = true;
        } else if (subscribers && user.isSubscriber) {
          eligible = true;
        }
      } else {
        eligible = true;
      }

      if (eligible) {
        await getRepository(QueueEntity).save({
          ...(await getRepository(QueueEntity).findOne({ username: opts.sender.username })),
          username:     opts.sender.username,
          isFollower:   user.isFollower,
          isSubscriber: user.isSubscriber,
          isModerator:  user.isModerator,
          createdAt:    Date.now(),

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
    getRepository(QueueEntity).delete({});
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
        await getRepository(QueueEntity).delete({ username: user.username });
      }
    }

    this.pickedUsers = [];
    for (const user of users) {
      this.pickedUsers.push(user);
    }

    const atUsername = tmi.showWithAt;

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

    const response = msg.replace(/\$users/g, users.map(o => atUsername ? `@${o.username}` : o.username).join(', '));
    return {
      users,
      responses: [{ response, ...opts }],
    };
  }

  @command('!queue list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions): Promise<CommandResponse[]> {
    const [atUsername, users] = await Promise.all([
      tmi.showWithAt,
      getRepository(QueueEntity).find(),
    ]);
    const queueList = users.map(o => atUsername ? `@${o.username}` : o).join(', ');
    return [{ response: prepare('queue.list', { users: queueList }), ...opts }];
  }
}

export default new Queue();
