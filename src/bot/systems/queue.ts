import * as _ from 'lodash';

import { getOwner, prepare, sendMessage } from '../commons';
import { command, default_permission, settings, shared } from '../decorators';
import { permission } from '../permissions';
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
  @shared()
  locked: boolean = false;

  @settings('eligibility')
  eligibilityAll: boolean = true;
  @settings('eligibility')
  eligibilityFollowers: boolean = true;
  @settings('eligibility')
  eligibilitySubscribers: boolean = true;

  constructor () {
    super();

    this.addWidget('queue', 'widget-title-queue', 'fas fa-users');
  }

  sockets () {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }

    this.socket.on('connection', (socket) => {
      socket.on('pick', async (data, cb) => {
        if (data.username) {
          let users: any[] = [];
          if (_.isString(data.username)) {data.username = [data.username];}
          for (let user of data.username) {
            user = await global.db.engine.findOne(this.collection.data, { username: user });
            delete user._id;
            users.push(user);
          }
          cb(null, await this.pickUsers({ sender: getOwner(), users }, data.random));
        } else {cb(null, await this.pickUsers({ sender: getOwner(), parameters: String(data.count) }, data.random));}
      });
    });
  }

  async getUsers (opts) {
    opts = opts || { amount: 1 };
    let users = await global.db.engine.find(this.collection.data);

    if (opts.random) {
      users = users.sort(() => Math.random());
    } else {
      users = users.sort(o => -(new Date(o.created_at).getTime()));
    }

    let toReturn: any[] = [];
    let i = 0;
    for (let user of users) {
      const isNotFollowerEligible = !user.is.follower && (this.eligibilityFollowers);
      const isNotSubscriberEligible = !user.is.subscriber && (this.eligibilitySubscribers);
      if (isNotFollowerEligible && isNotSubscriberEligible) {continue;}

      if (i < opts.amount) {
        await global.db.engine.remove(this.collection.data, { _id: String(user._id) });
        delete user._id;
        toReturn.push(user);
      } else {break;}
      i++;
    }
    return toReturn;
  }

  @command('!queue')
  main (opts) {
    sendMessage(global.translate(this.locked ? 'queue.info.closed' : 'queue.info.opened'), opts.sender, opts.attr);
  }

  @command('!queue open')
  @default_permission(permission.CASTERS)
  open (opts) {
    this.locked = false;
    sendMessage(global.translate('queue.open'), opts.sender, opts.attr);
  }

  @command('!queue close')
  @default_permission(permission.CASTERS)
  close (opts) {
    this.locked = true;
    sendMessage(global.translate('queue.close'), opts.sender, opts.attr);
  }

  @command('!queue join')
  async join (opts) {
    if (!(this.locked)) {
      let user = await global.db.engine.findOne('users', { username: opts.sender.username });

      const [all, followers, subscribers] = await Promise.all([this.eligibilityAll, this.eligibilityFollowers, this.eligibilitySubscribers]);

      let eligible = false;
      if (!all) {
        if ((followers && subscribers) && (user.is.follower || user.is.subscriber)) {eligible = true;}
        else if (followers && user.is.follower) {eligible = true;}
        else if (subscribers && user.is.subscriber) {eligible = true;}
      } else {
        eligible = true;
      }

      if (eligible) {
        await global.db.engine.update(this.collection.data, { username: opts.sender.username }, { username: opts.sender.username, is: user.is, created_at: String(new Date()) });
        sendMessage(global.translate('queue.join.opened'), opts.sender, opts.attr);
      }
    } else {
      sendMessage(global.translate('queue.join.closed'), opts.sender, opts.attr);
    }
  }

  @command('!queue clear')
  @default_permission(permission.CASTERS)
  clear (opts) {
    global.db.engine.remove(this.collection.data, {});
    global.db.engine.remove(this.collection.picked, {});
    sendMessage(global.translate('queue.clear'), opts.sender, opts.attr);
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
      var input = opts.parameters.match(/^(\d+)?/)[0];
      var amount = (input === '' ? 1 : parseInt(input, 10));
      users = await this.getUsers({ amount, random });
    } else {
      users = opts.users;
      for (let user of users) {await global.db.engine.remove(this.collection.data, { username: user.username });}
    }

    await global.db.engine.remove(this.collection.picked, {});
    for (let user of users) {await global.db.engine.update(this.collection.picked, { username: user.username }, user);}

    const atUsername = global.tmi.showWithAt;

    var msg;
    switch (users.length) {
      case 0:
        msg = global.translate('queue.picked.none');
        break;
      case 1:
        msg = global.translate('queue.picked.single');
        break;
      default:
        msg = global.translate('queue.picked.multi');
    }

    sendMessage(msg.replace(/\$users/g, users.map(o => atUsername ? `@${o.username}` : o.username).join(', ')), opts.sender, opts.attr);
    return users;
  }

  @command('!queue list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    let [atUsername, users] = await Promise.all([
      global.tmi.showWithAt,
      global.db.engine.find(this.collection.data)
    ]);
    users = users.map(o => atUsername ? `@${o.username}` : o).join(', ');
    sendMessage(
      await prepare('queue.list', { users }), opts.sender
    );
  }
}

export default Queue;
export { Queue };
