import { Poll } from '@entity/poll';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import _, { merge } from 'lodash';

import { parserReply } from '../commons';
import {
  command, default_permission, helper, parser, settings,
} from '../decorators';
import {
  onBit, onMessage, onStartup, onTip,
} from '../decorators/on';
import Expects from '../expects.js';
import System from './_interface';

import { isStreamOnline } from '~/helpers/api';
import {
  announce, getOwnerAsSender, prepare,
} from '~/helpers/commons';
import { mainCurrency } from '~/helpers/currency';
import exchange from '~/helpers/currency/exchange';
import { warning } from '~/helpers/log.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions';
import { translate } from '~/translate';
import { app } from '~/helpers/panel';
import { adminMiddleware } from '~/socket';
import { validateOrReject } from 'class-validator';

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

  @onStartup()
  onStartup() {
    setInterval(() => {
      if (isStreamOnline.value) {
        this.reminder();
      }
    }, 1000);

    this.addMenu({
      category: 'manage', name: 'polls', id: 'manage/polls', this: this,
    });
  }

  async sendResponse(responses: CommandResponse[]) {
    for (let i = 0; i < responses.length; i++) {
      await parserReply(responses[i].response, { sender: responses[i].sender, discord: responses[i].discord, id: '' });
    }
  }

  public async sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/polls', adminMiddleware, async (req, res) => {
      res.send({
        data: await Poll.find(),
      });
    });
    app.delete('/api/systems/polls/', adminMiddleware, async (req, res) => {
      try {
        const response = await this.close({
          command:            this.getCommand('!poll close'),
          parameters:         '',
          createdAt:          0,
          sender:             getOwnerAsSender(),
          attr:               { skip: false, quiet: false },
          isAction:           false,
          isFirstTimeMessage: false,
          emotesOffsets:      new Map(),
          discord:            undefined,
        });
        this.sendResponse(response);
        res.send();
      } catch (e: any) {
        res.status(400).send(e.stack);
      }
    });
    app.get('/api/systems/polls/:id', async (req, res) => {
      res.send({
        data: await Poll.findOne({ where: { id: req.params.id } }),
      });
    });
    app.delete('/api/systems/polls/:id', adminMiddleware, async (req, res) => {
      const poll = await Poll.findOne({ where: { id: req.params.id } });
      await poll?.remove();
      res.status(404).send();
    });
    app.post('/api/systems/polls', adminMiddleware, async (req, res) => {
      try {
        const runningPoll = await Poll.findOpened();
        if (runningPoll) {
          throw new Error('Cannot save new poll if there is already poll in progress.');
        }
        const itemToSave = new Poll();
        merge(itemToSave, req.body);
        await validateOrReject(itemToSave);

        const parameters = `-${itemToSave.type} -title "${itemToSave.title}" ${itemToSave.options.filter((o) => o.trim().length > 0).join(' | ')}`;
        const response = await this.open({
          command:            this.getCommand('!poll open'),
          parameters,
          createdAt:          0,
          sender:             getOwnerAsSender(),
          attr:               { skip: false, quiet: false },
          isAction:           false,
          isFirstTimeMessage: false,
          emotesOffsets:      new Map(),
          discord:            undefined,
        });
        this.sendResponse(response);

        res.send({ data: await Poll.findOpened() });
      } catch (e) {
        if (e instanceof Error) {
          res.status(400).send({ errors: e.message });
        } else {
          res.status(400).send({ errors: e });
        }
      }
    });
  }

  @command('!poll close')
  @default_permission(defaultPermissions.MODERATORS)
  public async close(opts: CommandOptions): Promise<CommandResponse[]> {
    const responses: CommandResponse[] = [];
    const cVote = await Poll.findOpened();

    try {
      if (!cVote) {
        throw new Error(String(ERROR.ALREADY_CLOSED));
      } else {
        cVote.closedAt = new Date().toISOString();
        await cVote.save();

        let _total = 0;
        const count = cVote.votes.reduce((prev: { [option: number]: number } | null, cur) => {
          _total += cur.votes;
          if (!prev) {
            return { [cur.option]: cur.votes };
          } else {
            return { ...prev, [cur.option]: Number(prev[cur.option] || 0) + cur.votes };
          }
        }, null);

        // get vote status
        responses.push({ response: prepare('systems.polls.status_closed', { title: cVote.title }), ...opts });
        for (const index of Object.keys(cVote.options)) {
          const option = cVote.options[Number(index)];
          const votesCount = count ? count[Number(index)] || 0 : 0;
          const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
          if (cVote.type === 'normal') {
            responses.push({ response: this.getCommand('!vote') + ` ${Number(index) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
          } else if (cVote.type === 'numbers') {
            responses.push({ response: `${Number(index) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
          } else if (cVote.type === 'tips') {
            responses.push({ response: `#vote${Number(index) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
          } else {
            responses.push({ response: `#vote${Number(index) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
          }
        }
      }
    } catch (e: any) {
      switch (e.message) {
        case String(ERROR.ALREADY_CLOSED):
          responses.push({ response: translate('systems.polls.notInProgress'), ...opts });
          break;
      }
    }
    return responses;
  }

  @command('!poll open')
  @default_permission(defaultPermissions.MODERATORS)
  public async open(opts: CommandOptions): Promise<CommandResponse[]> {
    const cVote = await Poll.findOpened();

    try {
      const responses: CommandResponse[] = [];
      if (cVote) {
        throw new Error(String(ERROR.ALREADY_OPENED));
      }

      const [type, title, options] = new Expects(opts.parameters)
        .switch({
          name: 'type', values: ['tips', 'bits', 'normal', 'numbers'], optional: true, default: 'normal',
        })
        .argument({
          name: 'title', optional: false, multi: true,
        })
        .list({ delimiter: '|' })
        .toArray();
      if (options.length < 2) {
        throw new Error(String(ERROR.NOT_ENOUGH_OPTIONS));
      }

      const poll = new Poll();
      poll.title = title;
      poll.options = options;
      poll.type = type;
      poll.openedAt = new Date().toISOString();
      await poll.save();

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
        } else if (type === 'numbers') {
          responses.push({ response: `${Number(index) + 1} => ${options[index]}`, ...opts });
        } else {
          responses.push({ response: `#vote${(Number(index) + 1)} => ${options[index]}`, ...opts });
        }
      }

      this.lastTimeRemind = Date.now();
      return responses;
    } catch (e: any) {
      switch (e.message) {
        case String(ERROR.NOT_ENOUGH_OPTIONS):
          return [{ response: translate('voting.notEnoughOptions'), ...opts }];
        case String(ERROR.ALREADY_OPENED): {
          if (!cVote) {
            return [];
          }
          const translations = 'systems.polls.alreadyOpened' + (cVote.type.length > 0 ? `_${cVote.type}` : '');
          const responses: CommandResponse[] = [];

          responses.push({
            response: prepare(translations, {
              title:   cVote.title,
              command: this.getCommand('!vote'),
            }), ...opts,
          });
          for (const index of Object.keys(cVote.options)) {
            if (cVote.type === 'normal') {
              responses.push({ response: this.getCommand('!poll open') + ` ${index} => ${cVote.options[Number(index)]}`, ...opts });
            } else if (cVote.type === 'numbers') {
              responses.push({ response: `${Number(index) + 1} => ${cVote.options[Number(index)]}`, ...opts });
            } else {
              responses.push({ response: `#vote${(Number(index) + 1)} => ${cVote.options[Number(index)]}`, ...opts });
            }
          }
          return responses;
        }
        default:
          warning(e.stack);
          return [{ response: translate('core.error'), ...opts }];
      }
    }
  }

  @command('!vote')
  @helper()
  public async main(opts: CommandOptions): Promise<CommandResponse[]> {
    const cVote = await Poll.findOpened();
    let index: number;

    try {
      const responses: CommandResponse[] = [];
      if (opts.parameters.length === 0 && cVote) {
        let _total = 0;
        const count = cVote.votes.reduce((prev: { [option: number]: number } | null, cur) => {
          _total += cur.votes;
          if (!prev) {
            return { [cur.option]: cur.votes };
          } else {
            return { ...prev, [cur.option]: Number(prev[cur.option] || 0) + cur.votes };
          }
        }, null);
        // get vote status
        responses.push({ response: prepare('systems.polls.status', { title: cVote.title }), ...opts });
        for (const i of Object.keys(cVote.options)) {
          const option = cVote.options[Number(i)];
          const votesCount = count ? count[Number(i)] || 0 : 0;
          const percentage = Number((100 / _total) * votesCount || 0).toFixed(2);
          if (cVote.type === 'normal') {
            responses.push({ response: this.getCommand('!vote') + ` ${Number(i) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
          } else if (cVote.type === 'tips') {
            responses.push({ response: `#vote${Number(i) + 1} - ${option} - ${Number(votesCount).toFixed(2)} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
          } else if (cVote.type === 'numbers') {
            responses.push({ response: `${Number(i) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
          } else {
            responses.push({ response: `#vote${Number(i) + 1} - ${option} - ${votesCount} ${getLocalizedName(votesCount, translate('systems.polls.votes'))}, ${percentage}%`, ...opts });
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
        if (cVote.options.length < Number(index) + 1 || index < 0) {
          throw new Error(String(ERROR.INVALID_VOTE));
        } else {
          const vote = cVote.votes.find(o => o.votedBy === opts.sender.userName);
          if (vote) {
            vote.option = index;
            await cVote.save();
          } else {
            cVote.votes.push({
              votedBy: opts.sender.userName,
              votes:   1,
              option:  index,
            });
          }
          await cVote.save();
        }
      } else {
        throw new Error(String(ERROR.INVALID_VOTE_TYPE));
      }
      return responses;
    } catch (e: any) {
      switch (e.message) {
        case String(ERROR.NO_VOTING_IN_PROGRESS):
          return [{ response: prepare('systems.polls.notInProgress'), ...opts }];
      }
    }
    return [];
  }

  @parser()
  async participateByNumber(opts: ParserOptions) {
    if (!opts.sender) {
      return true;
    }
    try {
      if (opts.message.match(/^(\d+)$/)) {
        const cVote = await Poll.findOpened();
        if (!cVote || cVote.type !== 'numbers') {
          return true; // do nothing if no vote in progress
        }
        const vote = cVote.votes.find(o => o.votedBy === opts.sender!.userName);
        if (Number(opts.message) > 0 && Number(opts.message) <= cVote.options.length) {
          if (vote) {
            vote.option = Number(opts.message) - 1;
          } else {
            cVote.votes.push({
              option:  Number(opts.message) - 1,
              votes:   1,
              votedBy: opts.sender.userName,
            });
          }
          await cVote.save();
        }
      }
    } catch (e: any) {
      warning(e.stack);
    }
    return true;
  }

  @onBit()
  protected async parseBit(opts: onEventBit): Promise<void> {
    const cVote = await Poll.findOpened();

    if (cVote && cVote.type === 'bits') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // no update as we will not switch vote option as in normal vote
          cVote.votes.push({
            option:  i - 1,
            votes:   opts.amount,
            votedBy: opts.userName,
          });
          await cVote.save();
          break;
        }
      }
    }
  }

  @onTip()
  protected async parseTip(opts: onEventTip): Promise<void> {
    const cVote = await Poll.findOpened();

    if (cVote && cVote.type === 'tips') {
      for (let i = cVote.options.length; i > 0; i--) {
        // we are going downwards because we are checking include and 1 === 10
        if (opts.message.includes('#vote' + i)) {
          // no update as we will not switch vote option as in normal vote
          cVote.votes.push({
            option:  i - 1,
            votes:   Number(exchange(opts.amount, opts.currency, mainCurrency.value)),
            votedBy: opts.userName,
          });
          await cVote.save();
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
    const vote = await Poll.findOpened();
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
        title:   vote.title,
        command: this.getCommand('!vote'),
      }), 'polls');
      for (const index of Object.keys(vote.options)) {
        setTimeout(() => {
          if (vote.type === 'numbers') {
            announce(`${(Number(index) + 1)} => ${vote.options[Number(index)]}`, 'polls');
          } else if (vote.type === 'normal') {
            announce(this.getCommand('!vote') + ` ${(Number(index) + 1)} => ${vote.options[Number(index)]}`, 'polls');
          } else {
            announce(`#vote${(Number(index) + 1)} => ${vote.options[Number(index)]}`, 'polls');
          }
        }, 300 * (Number(index) + 1));
      }
    }
  }
}

export default new Polls();
