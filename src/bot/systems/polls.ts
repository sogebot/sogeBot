'use strict';

// 3rdparty libraries
const {
  isMainThread,
  // tslint:disable-next-line:no-var-requires
} = require('worker_threads');
import * as _ from 'lodash';

// bot libraries
import constants from '../constants';
import Expects from '../expects.js';
import System from './_interface';

enum ERROR {
  NOT_ENOUGH_OPTIONS,
  NO_VOTING_IN_PROGRESS,
  INVALID_VOTE_TYPE,
  INVALID_VOTE,
  ALREADY_OPENED,
  ALREADY_CLOSED,
}

/*
 * !vote
 * !vote [x]
 * !poll open [-tips/-bits/-points] -title "your vote title" option | option | option
 * !poll close
 */

class Polls extends System {
  [x: string]: any; // TODO: remove after interface ported to TS

  private currentMessages: number;
  private lastMessageRemind: number;
  private lastTimeRemind: number;

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        reminder: {
          everyXMessages: 0,
          everyXSeconds: 0,
        },
        commands: [
          { name: '!vote', isHelper: true },
          { name: '!poll open', permission: constants.MODS },
          { name: '!poll close', permission: constants.MODS },
        ],
      },
      on: {
        message: (message): Promise<void> => this.countMessage(),
        tip: (tip): Promise<void> => this.parseTip(tip),
        bit: (bit): Promise<void> => this.parseBit(bit),
      },
    };

    super(options);

    this.currentMessages = 0;
    this.lastMessageRemind = 0;
    this.lastTimeRemind = 0;

    if (isMainThread) {
      global.db.engine.index({ table: this.collection.votes, index: 'vid' });
      global.db.engine.index({ table: this.collection.data, index: 'openedAt' });

      setInterval(() => this.reminder(), 1000);
    }

    this.addMenu({ category: 'manage', name: 'polls', id: '/manage/polls' });
  }

  public async sockets() {
    this.socket.on('connection', (socket) => {
      socket.on('create', async (vote: Poll, cb) => {
        try {
          const parameters = `-${vote.type} -title "${vote.title}" ${vote.options.filter((o) => o.trim().length > 0).join(' | ')}`;
          this.open({
            command: this.settings.commands['!poll open'],
            parameters,
            sender: {
              username: global.commons.getOwner(),
              userId: '0',
              badges: {
                subscriber: 1,
              },
            },
          });
          cb(null, null);
        } catch (e) {
          cb(e.stack, null);
        }
      });
      socket.on('close', async (vote: Poll, cb) => {
        try {
          this.close({
            command: this.settings.commands['!poll close'],
            parameters: '',
            sender: {
              username: global.commons.getOwner(),
              userId: '0',
              badges: {
                subscriber: 1,
              },
            },
          });
          cb(null);
        } catch (e) {
          cb(e.stack);
        }
      });
    });
  }

  public async close(opts: CommandOptions): Promise<boolean> {
    const cVote: Poll = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    try {
      if (_.isEmpty(cVote)) {
        throw new Error(String(ERROR.ALREADY_CLOSED));
      } else {
        const votes: Vote[] = await global.db.engine.find(this.collection.votes, { vid: String(cVote._id) });
        await global.db.engine.update(this.collection.data, { _id: String(cVote._id) }, { isOpened: false, closedAt: Date.now() });

        const count = {};
        let _total = 0;
        for (let i = 0, length = votes.length; i < length; i++) {
          if (!count[votes[i].option]) { count[votes[i].option] = votes[i].votes; } else { count[votes[i].option] = count[votes[i].option] + votes[i].votes; }
          _total = _total + votes[i].votes;
        }
        // get vote status
        global.commons.sendMessage(global.commons.prepare('systems.polls.status_closed', {
          title: cVote.title,
        }), opts.sender);
        for (const index of Object.keys(cVote.options)) {
          setTimeout(() => {
            const option = cVote.options[index];
            const votesCount = count[index] || 0;
            const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
            if (cVote.type === 'normal') {
              global.commons.sendMessage(this.settings.commands['!vote'] + ` ${Number(index) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender);
            } else if (cVote.type === 'tips') {
              global.commons.sendMessage(`#vote${Number(index) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${global.commons.getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender);
            } else {
              global.commons.sendMessage(`#vote${Number(index) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender);
            }
          }, 300 * (Number(index) + 1));
        }
      }
    } catch (e) {
      switch (e.message) {
        case String(ERROR.ALREADY_CLOSED):
          global.commons.sendMessage(global.translate('systems.polls.notInProgress'), opts.sender);
          break;
      }
      return false;
    }
    return true;
  }

  public async open(opts: CommandOptions): Promise<boolean> {
    const cVote: Poll = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    try {
      if (!_.isEmpty(cVote)) { throw new Error(String(ERROR.ALREADY_OPENED)); }

      const [type, title, options] = new Expects(opts.parameters)
        .switch({ name: 'type', values: ['tips', 'bits', 'normal'], optional: true, default: 'normal' })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray();
      if (options.length < 2) { throw new Error(String(ERROR.NOT_ENOUGH_OPTIONS)); }

      const voting: Poll = { type, title, isOpened: true, options, openedAt: Date.now() };
      await global.db.engine.insert(this.collection.data, voting);

      const translations = `systems.polls.opened_${type}`;
      global.commons.sendMessage(global.commons.prepare(translations, {
        title,
        command: this.settings.commands['!vote'],
      }), opts.sender);
      for (const index of Object.keys(options)) {
        setTimeout(() => {
          if (type === 'normal') { global.commons.sendMessage(this.settings.commands['!vote'] + ` ${(Number(index) + 1)} => ${options[index]}`, opts.sender); } else { global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${options[index]}`, opts.sender); }
        }, 300 * (Number(index) + 1));
      }

      this.lastTimeRemind = Date.now();
      return true;
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NOT_ENOUGH_OPTIONS):
          global.commons.sendMessage(global.translate('voting.notEnoughOptions'), opts.sender);
          break;
        case String(ERROR.ALREADY_OPENED):
          const translations = 'systems.polls.opened' + (cVote.type.length > 0 ? `_${cVote.type}` : '');
          global.commons.sendMessage(global.commons.prepare(translations, {
            title: cVote.title,
            command: this.settings.commands['!vote'],
          }), opts.sender);
          for (const index of Object.keys(cVote.options)) {
            setTimeout(() => {
              if (cVote.type === 'normal') { global.commons.sendMessage(this.settings.commands['!poll open'] + ` ${index} => ${cVote.options[index]}`, opts.sender); } else { global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${cVote.options[index]}`, opts.sender); }
            }, 300 * (Number(index) + 1));
          }
          break;
        default:
          global.log.warning(e.stack);
          global.commons.sendMessage(global.translate('core.error'), opts.sender);
      }
      return false;
    }
  }

  public async main(opts: CommandOptions): Promise<void> {
    const cVote: Poll = await global.db.engine.findOne(this.collection.data, { isOpened: true });
    let index: number;

    try {
      if (opts.parameters.length === 0 && !_.isEmpty(cVote)) {
        const votes: Vote[] = await global.db.engine.find(this.collection.votes, { vid: String(cVote._id) });

        const count = {};
        let _total = 0;
        for (let i = 0, length = votes.length; i < length; i++) {
          if (!count[votes[i].option]) { count[votes[i].option] = votes[i].votes; } else { count[votes[i].option] = count[votes[i].option] + votes[i].votes; }
          _total = _total + votes[i].votes;
        }
        // get vote status
        global.commons.sendMessage(global.commons.prepare('systems.polls.status', {
          title: cVote.title,
        }), opts.sender);
        for (const i of Object.keys(cVote.options)) {
          setTimeout(() => {
            const option = cVote.options[i];
            const votesCount = count[i] || 0;
            const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
            if (cVote.type === 'normal') {
              global.commons.sendMessage(this.settings.commands['!vote'] + ` ${Number(i) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender);
            } else if (cVote.type === 'tips') {
              global.commons.sendMessage(`#vote${Number(i) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${global.commons.getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender);
            } else {
              global.commons.sendMessage(`#vote${Number(i) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender);
            }
          }, 100 * (Number(i) + 1));
        }

      } else if (_.isEmpty(cVote)) { throw new Error(String(ERROR.NO_VOTING_IN_PROGRESS)); } else if (cVote.type === 'normal') {
        // we expects number
        [index] = new Expects(opts.parameters)
          .number()
          .toArray();
        index = index - 1;
        if (cVote.options.length < index + 1 || index < 0) {
          throw new Error(String(ERROR.INVALID_VOTE));
        } else {
          const vote: Vote = {
            vid: String(cVote._id),
            votedBy: opts.sender ? opts.sender.username : 'n/a',
            votes: 1,
            option: index,
          };
          await global.db.engine.update(this.collection.votes, { vid: vote.vid, votedBy: vote.votedBy }, vote);
        }
      } else {
        throw new Error(String(ERROR.INVALID_VOTE_TYPE));
      }
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NO_VOTING_IN_PROGRESS):
          global.commons.sendMessage(global.commons.prepare('systems.polls.notInProgress'), opts.sender);
          break;
        case String(ERROR.INVALID_VOTE):
          // pass, we don't want to have error message
          break;
      }
    }
  }

  private async parseBit(opts: { username: string, amount: number, message: string }): Promise<void> {
    const cVote: Poll = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    if (!_.isEmpty(cVote) && cVote.type === 'bits') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // vote found
          const vote: Vote = {
            vid: String(cVote._id),
            votedBy: opts.username,
            votes: opts.amount,
            option: i - 1,
          };
          // no update as we will not switch vote option as in normal vote
          await global.db.engine.insert(this.collection.votes, vote);
          break;
        }
      }
    }
  }

  private async parseTip(opts: { username: string, amount: number, message: string, currency: string }): Promise<void> {
    const cVote: Poll = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    if (!_.isEmpty(cVote) && cVote.type === 'tips') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // vote found
          const vote: Vote = {
            vid: String(cVote._id),
            votedBy: opts.username,
            votes: Number(global.currency.exchange(opts.amount, opts.currency, global.currency.settings.currency.mainCurrency)),
            option: i - 1,
          };
          // no update as we will not switch vote option as in normal vote
          await global.db.engine.insert(this.collection.votes, vote);
          break;
        }
      }
    }
  }

  private async countMessage() {
    this.currentMessages = this.currentMessages + 1;
  }

  private async reminder() {
    const vote: Poll = await global.db.engine.findOne(this.collection.data, { isOpened: true });
    const shouldRemind = { messages: false, time: false };

    if (this.settings.reminder.everyXMessages === 0 && this.settings.reminder.everyXSeconds === 0 || _.isEmpty(vote)) {
      this.lastMessageRemind = this.currentMessages;
      this.lastTimeRemind = 0;
      return; // reminder is disabled
    }

    if (this.settings.reminder.everyXMessages === 0) {
      shouldRemind.messages = true;
    } else {
      if (this.currentMessages - this.lastMessageRemind >= this.settings.reminder.everyXMessages) {
        shouldRemind.messages = true;
      } else {
        shouldRemind.messages = false;
      }
    }

    if (this.settings.reminder.everyXSeconds === 0) {
      shouldRemind.time = true;
    } else {
      if (new Date().getTime() - new Date(this.lastTimeRemind).getTime() > this.settings.reminder.everyXSeconds * 1000) {
        shouldRemind.time = true;
      } else {
        shouldRemind.time = false;
      }
    }

    if (_.every(shouldRemind)) {
      // update last remind data
      this.lastMessageRemind = this.currentMessages;
      this.lastTimeRemind = Date.now();

      const translations = `systems.polls.opened_${vote.type}`;
      global.commons.sendMessage(global.commons.prepare(translations, {
        title: vote.title,
        command: this.settings.commands['!vote'],
      }), global.commons.getOwner());
      for (const index of Object.keys(vote.options)) {
        setTimeout(() => {
          if (vote.type === 'normal') { global.commons.sendMessage(this.settings.commands['!vote'] + ` ${(Number(index) + 1)} => ${vote.options[index]}`, global.commons.getOwner()); } else { global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${vote.options[index]}`, global.commons.getOwner()); }
        }, 300 * (Number(index) + 1));
      }
    }
  }
}

module.exports = new Polls();
