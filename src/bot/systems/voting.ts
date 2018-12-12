'use strict';

// 3rdparty libraries
import * as cluster from 'cluster';
import _ from 'lodash';

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

declare interface VoteType {
  _id?: any;
  vid: string;
  votedBy: string;
  votes: number;
  option: number;
}

declare interface VotingType {
  _id?: any;
  type: 'tips' | 'bits' | 'normal';
  title: string;
  isOpened: boolean;
  options: string[];
  openedAt: string;
  closedAt?: string;
}

/*
 * !vote
 * !vote [x]
 * !vote open [-tips/-bits/-points] -title "your vote title" option | option | option
 * !vote close
 */

class Voting extends System {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        commands: [
          { name: '!vote', isHelper: true },
          { name: '!vote open', permission: constants.MODS },
          { name: '!vote close', permission: constants.MODS },
        ],
      },
      on: {
        tip: (tip): Promise<void> => this.parseTip(tip),
        bit: (bit): Promise<void> => this.parseBit(bit),
      },
    };

    super(options);

    if (cluster.isMaster) {
      global.db.engine.index({ table: this.collection.votes, index: 'vid' });
      global.db.engine.index({ table: this.collection.data, index: 'openedAt' });
    }
  }

  public async close(opts: CommandOptions): Promise<boolean> {
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    try {
      if (_.isEmpty(cVote)) {
        throw new Error(String(ERROR.ALREADY_CLOSED));
      } else {
        const votes: VoteType[] = await global.db.engine.find(this.collection.votes, { vid: String(cVote._id) });
        await global.db.engine.update(this.collection.data, { _id: String(cVote._id) }, { isOpened: false, closedAt: String(new Date()) });

        const count = {};
        let _total = 0;
        for (let i = 0, length = votes.length; i < length; i++) {
          if (!count[votes[i].option]) { count[votes[i].option] = votes[i].votes; } else { count[votes[i].option] = count[votes[i].option] + votes[i].votes; }
          _total = _total + votes[i].votes;
        }
        // get vote status
        global.commons.sendMessage(global.commons.prepare('systems.voting.status_closed', {
          title: cVote.title,
        }), opts.sender);
        for (const index of Object.keys(cVote.options)) {
          setTimeout(() => {
            const option = cVote.options[index];
            const votesCount = count[index] || 0;
            if (cVote.type === 'normal') {
              global.commons.sendMessage(this.settings.commands['!vote'] + ` ${Number(index) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.voting.votes')}, ${Number((100 / _total) * votesCount).toFixed(2)}%`, opts.sender);
            } else {
              global.commons.sendMessage(`#vote${Number(index) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.voting.votes')}, ${Number((100 / _total) * votesCount).toFixed(2)}`, opts.sender);
            }
          }, 100 * (Number(index) + 1));
        }
      }
    } catch (e) {
      switch (e.message) {
        case String(ERROR.ALREADY_CLOSED):
          global.commons.sendMessage(global.translate('systems.voting.notInProgress'), opts.sender);
          break;
      }
      return false;
    }
    return true;
  }

  public async open(opts: CommandOptions): Promise<boolean> {
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    try {
      if (!_.isEmpty(cVote)) { throw new Error(String(ERROR.ALREADY_OPENED)); }

      const [type, title, options] = new Expects(opts.parameters)
        .switch({ name: 'type', values: ['tips', 'bits'], optional: true, default: 'normal' })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray();
      if (options.length < 2) { throw new Error(String(ERROR.NOT_ENOUGH_OPTIONS)); }

      const voting: VotingType = { type, title, isOpened: true, options, openedAt: String(new Date()) };
      await global.db.engine.insert(this.collection.data, voting);

      const translations = `systems.voting.opened_${type}`;
      global.commons.sendMessage(global.commons.prepare(translations, {
        title,
        command: this.settings.commands['!vote'],
      }), opts.sender);
      for (const index of Object.keys(options)) {
        setTimeout(() => {
          if (type === 'normal') { global.commons.sendMessage(this.settings.commands['!vote'] + ` ${(Number(index) + 1)} => ${options[index]}`, opts.sender); } else { global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${options[index]}`, opts.sender); }
        }, 100 * (Number(index) + 1));
      }
      return true;
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NOT_ENOUGH_OPTIONS):
          global.commons.sendMessage(global.translate('voting.notEnoughOptions'), opts.sender);
          break;
        case String(ERROR.ALREADY_OPENED):
          const translations = 'systems.voting.opened' + (cVote.type.length > 0 ? `_${cVote.type}` : '');
          global.commons.sendMessage(global.commons.prepare(translations, {
            title: cVote.title,
            command: this.settings.commands['!vote'],
          }), opts.sender);
          for (const index of Object.keys(cVote.options)) {
            setTimeout(() => {
              if (cVote.type === 'normal') { global.commons.sendMessage(this.settings.commands['!vote'] + ` ${index} => ${cVote.options[index]}`, opts.sender); } else { global.commons.sendMessage(`#vote${(Number(index) + 1)} => ${cVote.options[index]}`, opts.sender); }
            }, 100 * (Number(index) + 1));
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
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true });
    let index: number;

    try {
      if (opts.parameters.length === 0 && !_.isEmpty(cVote)) {
        const votes: VoteType[] = await global.db.engine.find(this.collection.votes, { vid: String(cVote._id) });

        const count = {};
        let _total = 0;
        for (let i = 0, length = votes.length; i < length; i++) {
          if (!count[votes[i].option]) { count[votes[i].option] = votes[i].votes; } else { count[votes[i].option] = count[votes[i].option] + votes[i].votes; }
          _total = _total + votes[i].votes;
        }
        // get vote status
        global.commons.sendMessage(global.commons.prepare('systems.voting.status', {
          title: cVote.title,
        }), opts.sender);
        for (const i of Object.keys(cVote.options)) {
          setTimeout(() => {
            const option = cVote.options[i];
            const votesCount = count[i] || 0;
            const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
            if (cVote.type === 'normal') {
              global.commons.sendMessage(this.settings.commands['!vote'] + ` ${Number(i) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.voting.votes')}, ${percentage}%`, opts.sender);
            } else {
              global.commons.sendMessage(`#vote${Number(i) + 1} - ${option} - ${votesCount} ${global.commons.getLocalizedName(votesCount, 'systems.voting.votes')}, ${percentage}`, opts.sender);
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
          const vote: VoteType = {
            vid: String(cVote._id),
            votedBy: opts.sender.username,
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
          global.commons.sendMessage(global.commons.prepare('systems.voting.notInProgress'), opts.sender);
          break;
        case String(ERROR.INVALID_VOTE):
          // pass, we don't want to have error message
          break;
      }
    }
  }

  private async parseBit(opts: { username: string, amount: number, message: string }): Promise<void> {
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    if (!_.isEmpty(cVote) && cVote.type === 'bits') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // vote found
          const vote: VoteType = {
            vid: String(cVote._id),
            votedBy: opts.username,
            votes: opts.amount,
            option: i,
          };
          global.db.engine.update(this.collection.votes, { vid: vote.vid, votedBy: vote.votedBy }, vote);
          break;
        }
      }
    }
  }

  private async parseTip(opts: { username: string, amount: number, message: string, currency: string }): Promise<void> {
    const cVote: VotingType = await global.db.engine.findOne(this.collection.data, { isOpened: true });

    if (!_.isEmpty(cVote) && cVote.type === 'tips') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // vote found
          const vote: VoteType = {
            vid: String(cVote._id),
            votedBy: opts.username,
            votes: parseFloat(global.currency.exchange(opts.amount, opts.currency, global.currency.settings.currency.mainCurrency)),
            option: i,
          };
          global.db.engine.update(this.collection.votes, { vid: vote.vid, votedBy: vote.votedBy }, vote);
          break;
        }
      }
    }
  }
}

module.exports = new Voting();
