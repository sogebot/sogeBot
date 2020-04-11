import _ from 'lodash';
import { isMainThread } from '../cluster';

import { getLocalizedName, getOwnerAsSender, prepare, sendMessage } from '../commons.js';
import { command, default_permission, helper, settings } from '../decorators';
import { onBit, onMessage, onTip } from '../decorators/on';
import Expects from '../expects.js';
import { permission } from '../helpers/permissions';
import System from './_interface';

import { warning } from '../helpers/log.js';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Poll, PollVote } from '../database/entity/poll';
import oauth from '../oauth';
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
  public async close(opts: CommandOptions): Promise<boolean> {
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
        sendMessage(prepare('systems.polls.status_closed', {
          title: cVote.title,
        }), opts.sender);
        for (const index of Object.keys(cVote.options)) {
          setTimeout(() => {
            const option = cVote.options[index];
            const votesCount = count[index] || 0;
            const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
            if (cVote.type === 'normal') {
              sendMessage(this.getCommand('!vote') + ` ${Number(index) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender, opts.attr);
            } else if (cVote.type === 'tips') {
              sendMessage(`#vote${Number(index) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender, opts.attr);
            } else {
              sendMessage(`#vote${Number(index) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender, opts.attr);
            }
          }, 300 * (Number(index) + 1));
        }
      }
    } catch (e) {
      switch (e.message) {
        case String(ERROR.ALREADY_CLOSED):
          sendMessage(translate('systems.polls.notInProgress'), opts.sender, opts.attr);
          break;
      }
      return false;
    }
    return true;
  }

  @command('!poll open')
  @default_permission(permission.MODERATORS)
  public async open(opts: CommandOptions): Promise<boolean> {
    const cVote = await getRepository(Poll).findOne({ isOpened: true });

    try {
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
      sendMessage(prepare(translations, {
        title,
        command: this.getCommand('!vote'),
      }), opts.sender);
      for (const index of Object.keys(options)) {
        setTimeout(() => {
          if (type === 'normal') {
            sendMessage(this.getCommand('!vote') + ` ${(Number(index) + 1)} => ${options[index]}`, opts.sender);
          } else {
            sendMessage(`#vote${(Number(index) + 1)} => ${options[index]}`, opts.sender, opts.attr);
          }
        }, 300 * (Number(index) + 1));
      }

      this.lastTimeRemind = Date.now();
      return true;
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NOT_ENOUGH_OPTIONS):
          sendMessage(translate('voting.notEnoughOptions'), opts.sender, opts.attr);
          break;
        case String(ERROR.ALREADY_OPENED):
          if (!cVote) {
            return false;
          }
          const translations = 'systems.polls.opened' + (cVote.type.length > 0 ? `_${cVote.type}` : '');
          sendMessage(prepare(translations, {
            title: cVote.title,
            command: this.getCommand('!vote'),
          }), opts.sender);
          for (const index of Object.keys(cVote.options)) {
            setTimeout(() => {
              if (cVote.type === 'normal') {
                sendMessage(this.getCommand('!poll open') + ` ${index} => ${cVote.options[index]}`, opts.sender);
              } else {
                sendMessage(`#vote${(Number(index) + 1)} => ${cVote.options[index]}`, opts.sender, opts.attr);
              }
            }, 300 * (Number(index) + 1));
          }
          break;
        default:
          warning(e.stack);
          sendMessage(translate('core.error'), opts.sender, opts.attr);
      }
      return false;
    }
  }

  @command('!vote')
  @helper()
  public async main(opts: CommandOptions): Promise<void> {
    const cVote = await getRepository(Poll).findOne({
      relations: ['votes'],
      where: { isOpened: true },
    });
    let index: number;

    try {
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
        sendMessage(prepare('systems.polls.status', {
          title: cVote.title,
        }), opts.sender);
        for (const i of Object.keys(cVote.options)) {
          setTimeout(() => {
            const option = cVote.options[i];
            const votesCount = count[i] || 0;
            const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
            if (cVote.type === 'normal') {
              sendMessage(this.getCommand('!vote') + ` ${Number(i) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender, opts.attr);
            } else if (cVote.type === 'tips') {
              sendMessage(`#vote${Number(i) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender, opts.attr);
            } else {
              sendMessage(`#vote${Number(i) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, 'systems.polls.votes')}, ${percentage}%`, opts.sender, opts.attr);
            }
          }, 100 * (Number(i) + 1));
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
    } catch (e) {
      switch (e.message) {
        case String(ERROR.NO_VOTING_IN_PROGRESS):
          sendMessage(prepare('systems.polls.notInProgress'), opts.sender, opts.attr);
          break;
        case String(ERROR.INVALID_VOTE):
          // pass, we don't want to have error message
          break;
      }
    }
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
      sendMessage(prepare(translations, {
        title: vote.title,
        command: this.getCommand('!vote'),
      }), {
        username: oauth.botUsername,
        displayName: oauth.botUsername,
        userId: Number(oauth.botId),
        emotes: [],
        badges: {},
        'message-type': 'chat',
      });
      for (const index of Object.keys(vote.options)) {
        setTimeout(() => {
          if (vote.type === 'normal') {
            sendMessage(this.getCommand('!vote') + ` ${(Number(index) + 1)} => ${vote.options[index]}`, {
              username: oauth.botUsername,
              displayName: oauth.botUsername,
              userId: Number(oauth.botId),
              emotes: [],
              badges: {},
              'message-type': 'chat',
            });
          } else {
            sendMessage(`#vote${(Number(index) + 1)} => ${vote.options[index]}`, {

              username: oauth.botUsername,
              displayName: oauth.botUsername,
              userId: Number(oauth.botId),
              emotes: [],
              badges: {},
              'message-type': 'chat',
            });
          }
        }, 300 * (Number(index) + 1));
      }
    }
  }
}

export default new Polls();
