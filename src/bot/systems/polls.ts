import _ from 'lodash';
import { isMainThread } from '../cluster';

import { announce, getLocalizedName, getOwnerAsSender, prepare } from '../commons.js';
import { command, default_permission, helper, settings } from '../decorators';
import { onBit, onMessage, onTip } from '../decorators/on';
import Expects from '../expects.js';
import { permission } from '../helpers/permissions';
import System from './_interface';

import { warning } from '../helpers/log.js';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Poll, PollVote } from '../database/entity/poll';
import { translate } from '../translate';
import currency from '../currency';

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
  private currentMessages = 0;
  private lastMessageRemind = 0;
  private lastTimeRemind = 0;

  @settings('reminder')
  everyXMessages = 0;
  @settings('reminder')
  everyXSeconds = 0;

  constructor() {
    super();

    if (isMainThread) {
      setInterval(() => this.reminder(), 1000);
    }

    this.addMenu({ category: 'manage', name: 'polls', id: 'manage/polls' });
  }

  public async sockets() {
    adminEndpoint(this.nsp, 'polls::getAll', async (cb) => {
      try {
        cb(null, await getRepository(Poll).find({
          relations: ['votes'],
          order: {
            openedAt: 'DESC',
          },
        }));
      } catch(e) {
        cb(e.stack, []);
      }
    });
    adminEndpoint(this.nsp, 'create', async (vote: Poll, cb) => {
      try {
        const parameters = `-${vote.type} -title "${vote.title}" ${vote.options.filter((o) => o.trim().length > 0).join(' | ')}`;
        this.open({
          command: this.getCommand('!poll open'),
          parameters,
          createdAt: 0,
          sender: getOwnerAsSender(),
          attr: { skip: false, quiet: false },
        });
        cb(null, null);
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'close', async (vote: Poll, cb) => {
      try {
        this.close({
          command: this.getCommand('!poll close'),
          parameters: '',
          createdAt: 0,
          sender: getOwnerAsSender(),
          attr: { skip: false, quiet: false },
        });
        cb(null);
      } catch (e) {
        cb(e.stack);
      }
    });
  }

  @command('!poll close')
  @default_permission(permission.MODERATORS)
  public async close(opts: CommandOptions): Promise<CommandResponse[]> {
    const responses: CommandResponse[] = [];
    const cVote = await getRepository(Poll).findOne({
      relations: ['votes'],
      where: { isOpened: true },
    });

    try {
      if (!cVote) {
        throw new Error(String(ERROR.ALREADY_CLOSED));
      } else {
        await getRepository(Poll).save({
          ...cVote,
          isOpened: false,
          closedAt: Date.now(),
        });

        const count = {};
        let _total = 0;
        for (let i = 0, length = cVote.votes.length; i < length; i++) {
          if (!count[cVote.votes[i].option]) {
            count[cVote.votes[i].option] = cVote.votes[i].votes;
          } else {
            count[cVote.votes[i].option] = count[cVote.votes[i].option] + cVote.votes[i].votes;
          }
          _total = _total + cVote.votes[i].votes;
        }
        // get vote status
        responses.push({
          response: prepare('systems.polls.status_closed', {
            title: cVote.title,
          }), ...opts,
        });
        for (const index of Object.keys(cVote.options)) {
          const option = cVote.options[index];
          const votesCount = count[index] || 0;
          const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
          if (cVote.type === 'normal') {
            responses.push({ response: this.getCommand('!vote') + ` ${Number(index) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, ...opts });
          } else if (cVote.type === 'tips') {
            responses.push({ response: `#vote${Number(index) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, ...opts });
          } else {
            responses.push({ response: `#vote${Number(index) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, ...opts });
          }
        }
      }
    } catch (e) {
      switch (e.message) {
        case String(ERROR.ALREADY_CLOSED):
          responses.push({ response: translate('systems.polls.notInProgress'), ...opts });
          break;
      }
    }
    return responses;
  }

  @command('!poll open')
  @default_permission(permission.MODERATORS)
  public async open(opts: CommandOptions): Promise<CommandResponse[]> {
    const cVote = await getRepository(Poll).findOne({ isOpened: true });

    try {
      const responses: CommandResponse[] = [];
      if (cVote) {
        throw new Error(String(ERROR.ALREADY_OPENED));
      }

      const [type, title, options] = new Expects(opts.parameters)
        .switch({ name: 'type', values: ['tips', 'bits', 'normal'], optional: true, default: 'normal' })
        .argument({ name: 'title', optional: false, multi: true })
        .list({ delimiter: '|' })
        .toArray();
      if (options.length < 2) {
        throw new Error(String(ERROR.NOT_ENOUGH_OPTIONS));
      }

      await getRepository(Poll).save({
        title: title,
        isOpened: true,
        options: options,
        type: type,
        openedAt: Date.now(),
      });

      const translations = `systems.polls.opened_${type}`;
      responses.push({
        response: prepare(translations, {
          title,
          command: this.getCommand('!vote'),
        }), ...opts,
      });
      for (const index of Object.keys(options)) {
        if (type === 'normal') {
          responses.push({ response: this.getCommand('!vote') + ` ${(Number(index) + 1)} => ${options[index]}`, ...opts });
        } else {
          responses.push({ response: `#vote${(Number(index) + 1)} => ${options[index]}`, ...opts });
        }
      }

      this.lastTimeRemind = Date.now();
      return responses;
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NOT_ENOUGH_OPTIONS):
          return [{ response: translate('voting.notEnoughOptions'), ...opts }];
          break;
        case String(ERROR.ALREADY_OPENED):
          if (!cVote) {
            return [];
          }
          const translations = 'systems.polls.alreadyOpened' + (cVote.type.length > 0 ? `_${cVote.type}` : '');
          const responses: CommandResponse[] = [];

          responses.push({
            response: prepare(translations, {
              title: cVote.title,
              command: this.getCommand('!vote'),
            }), ...opts,
          });
          for (const index of Object.keys(cVote.options)) {
            if (cVote.type === 'normal') {
              responses.push({ response: this.getCommand('!poll open') + ` ${index} => ${cVote.options[index]}`, ...opts });
            } else {
              responses.push({ response: `#vote${(Number(index) + 1)} => ${cVote.options[index]}`, ...opts });
            }
          }
          return responses;
        default:
          warning(e.stack);
          return [{ response: translate('core.error'), ...opts }];
      }
    }
  }

  @command('!vote')
  @helper()
  public async main(opts: CommandOptions): Promise<CommandResponse[]> {
    const cVote = await getRepository(Poll).findOne({
      relations: ['votes'],
      where: { isOpened: true },
    });
    let index: number;

    try {
      const responses: CommandResponse[] = [];
      if (opts.parameters.length === 0 && cVote) {
        const count = {};
        let _total = 0;
        for (let i = 0, length = cVote.votes.length; i < length; i++) {
          if (!count[cVote.votes[i].option]) {
            count[cVote.votes[i].option] = cVote.votes[i].votes;
          } else {
            count[cVote.votes[i].option] = count[cVote.votes[i].option] + cVote.votes[i].votes;
          }
          _total = _total + cVote.votes[i].votes;
        }
        // get vote status
        responses.push({
          response: prepare('systems.polls.status', {
            title: cVote.title,
          }), ...opts,
        });
        for (const i of Object.keys(cVote.options)) {
          const option = cVote.options[i];
          const votesCount = count[i] || 0;
          const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
          if (cVote.type === 'normal') {
            responses.push({ response: this.getCommand('!vote') + ` ${Number(i) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, ...opts });
          } else if (cVote.type === 'tips') {
            responses.push({ response: `#vote${Number(i) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, ...opts });
          } else {
            responses.push({ response: `#vote${Number(i) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, ...opts });
          }
        }
      } else if (!cVote) {
        throw new Error(String(ERROR.NO_VOTING_IN_PROGRESS));
      } else if (cVote.type === 'normal') {
        // we expects number
        [index] = new Expects(opts.parameters)
          .number()
          .toArray();
        index = index - 1;
        if (cVote.options.length < index + 1 || index < 0) {
          throw new Error(String(ERROR.INVALID_VOTE));
        } else {
          const vote = cVote.votes.find(o => o.votedBy === opts.sender.username);
          if (vote) {
            vote.option = index;
            await getRepository(Poll).save(cVote);
          } else {
            await getRepository(PollVote).save({
              poll: cVote,
              votedBy: opts.sender.username,
              votes: 1,
              option: index,
            });
          }
        }
      } else {
        throw new Error(String(ERROR.INVALID_VOTE_TYPE));
      }
      return responses;
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NO_VOTING_IN_PROGRESS):
          return [{ response: prepare('systems.polls.notInProgress'), ...opts }];
      }
    }
    return [];
  }

  @onBit()
  protected async parseBit(opts: { username: string; amount: number; message: string }): Promise<void> {
    const cVote = await getRepository(Poll).findOne({ isOpened: true });

    if (cVote && cVote.type === 'bits') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // no update as we will not switch vote option as in normal vote
          await getRepository(PollVote).save({
            poll: cVote,
            option: i - 1,
            votes: opts.amount,
            votedBy: opts.username,
          });
          break;
        }
      }
    }
  }

  @onTip()
  protected async parseTip(opts: { username: string; amount: number; message: string; currency: string }): Promise<void> {
    const cVote = await getRepository(Poll).findOne({ isOpened: true });

    if (cVote && cVote.type === 'tips') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // no update as we will not switch vote option as in normal vote
          await getRepository(PollVote).save({
            poll: cVote,
            option: i - 1,
            votes: Number(currency.exchange(opts.amount, opts.currency, currency.mainCurrency)),
            votedBy: opts.username,
          });
          break;
        }
      }
    }
  }

  @onMessage()
  protected async countMessage() {
    this.currentMessages = this.currentMessages + 1;
  }

  private async reminder() {
    const vote = await getRepository(Poll).findOne({ isOpened: true });
    const shouldRemind = { messages: false, time: false };

    if (this.everyXMessages === 0 && this.everyXSeconds === 0 || !vote) {
      this.lastMessageRemind = this.currentMessages;
      this.lastTimeRemind = 0;
      return; // reminder is disabled
    }

    if (this.everyXMessages === 0) {
      shouldRemind.messages = true;
    } else {
      if (this.currentMessages - this.lastMessageRemind >= this.everyXMessages) {
        shouldRemind.messages = true;
      } else {
        shouldRemind.messages = false;
      }
    }

    if (this.everyXSeconds === 0) {
      shouldRemind.time = true;
    } else {
      if (new Date().getTime() - new Date(this.lastTimeRemind).getTime() > this.everyXSeconds * 1000) {
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
      announce(prepare(translations, {
        title: vote.title,
        command: this.getCommand('!vote'),
      }));
      for (const index of Object.keys(vote.options)) {
        setTimeout(() => {
          if (vote.type === 'normal') {
            announce(this.getCommand('!vote') + ` ${(Number(index) + 1)} => ${vote.options[index]}`);
          } else {
            announce(`#vote${(Number(index) + 1)} => ${vote.options[index]}`);
          }
        }, 300 * (Number(index) + 1));
      }
    }
  }
}

export default new Polls();
