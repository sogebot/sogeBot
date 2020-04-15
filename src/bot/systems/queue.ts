import * as _ from 'lodash';

import { getOwner, prepare, sendMessage } from '../commons';
import { command, default_permission, settings, shared } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import { Queue as QueueEntity, QueueInterface } from '../database/entity/queue';
import { translate } from '../translate';
import tmi from '../tmi';

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
  @shared()
  locked = false;

  @settings('eligibility')
  eligibilityAll = true;
  @settings('eligibility')
  eligibilityFollowers = true;
  @settings('eligibility')
  eligibilitySubscribers = true;

  pickedUsers: QueueInterface[] = [];

  constructor () {
    super();

    this.addWidget('queue', 'widget-title-queue', 'fas fa-users');
  }

  sockets () {
    adminEndpoint(this.nsp, 'queue::getAllPicked', async(cb) => {
      try {
        cb(null, this.pickedUsers);
      } catch (e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'queue::getAll', async(cb) => {
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
          if (_.isString(data.username)) {
            data.username = [data.username];
          }
          for (let user of data.username) {
            user = await getRepository(QueueEntity).findOne({ username: user });
            users.push(user);
          }
          cb(null, await this.pickUsers({ sender: getOwner(), users }, data.random));
        } else {
          cb(null, await this.pickUsers({ sender: getOwner(), parameters: String(data.count) }, data.random));
        }
      } catch (e) {
        cb(e.stack);
      }
    });
  }

  async getUsers (opts) {
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
  main (opts) {
    sendMessage(translate(this.locked ? 'queue.info.closed' : 'queue.info.opened'), opts.sender, opts.attr);
  }

  @command('!queue open')
  @default_permission(permission.CASTERS)
  open (opts) {
    this.locked = false;
    sendMessage(translate('queue.open'), opts.sender, opts.attr);
  }

  @command('!queue close')
  @default_permission(permission.CASTERS)
  close (opts) {
    this.locked = true;
    sendMessage(translate('queue.close'), opts.sender, opts.attr);
  }

  @command('!queue join')
  async join (opts) {
    if (!(this.locked)) {
      const user = await getRepository(User).findOne({ userId: opts.sender.userId });
      if (!user) {
        await getRepository(User).save({
          userId: Number(opts.sender.userId),
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
          username: opts.sender.username,
          isFollower: user.isFollower,
          isSubscriber: user.isSubscriber,
          isModerator: user.isModerator,
          createdAt: Date.now(),

        });
        sendMessage(translate('queue.join.opened'), opts.sender, opts.attr);
      }
    } else {
      sendMessage(translate('queue.join.closed'), opts.sender, opts.attr);
    }
  }

  @command('!queue clear')
  @default_permission(permission.CASTERS)
  clear (opts) {
    getRepository(QueueEntity).delete({});
    this.pickedUsers = [];
    sendMessage(translate('queue.clear'), opts.sender, opts.attr);
  }

  @command('!queue random')
  @default_permission(permission.CASTERS)
  async random (opts) {
    this.pickUsers(opts, true);
  }

  @command('!queue pick')
  @default_permission(permission.CASTERS)
  async pick (opts) {
    this.pickUsers(opts, false);
  }

  async pickUsers (opts, random) {
    let users;
    if (!opts.users) {
      const input = opts.parameters.match(/^(\d+)?/)[0];
      const amount = (input === '' ? 1 : parseInt(input, 10));
      users = await this.getUsers({ amount, random });
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

    sendMessage(msg.replace(/\$users/g, users.map(o => atUsername ? `@${o.username}` : o.username).join(', ')), opts.sender, opts.attr);
    return users;
  }

  @command('!queue list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    const [atUsername, users] = await Promise.all([
      tmi.showWithAt,
      getRepository(QueueEntity).find(),
    ]);
    const queueList = users.map(o => atUsername ? `@${o.username}` : o).join(', ');
    sendMessage(
      prepare('queue.list', { users: queueList }), opts.sender
    );
  }
}

export default new Queue();
