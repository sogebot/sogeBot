import { isMainThread } from 'worker_threads';

import { getLocalizedName, getOwner, prepare, round5, sendMessage } from '../commons';
import constants from '../constants';
import { debug } from '../debug';
import { command, default_permission, settings, shared } from '../decorators';
import Expects from '../expects.js';
import { permission } from '../permissions';
import System from './_interface';

enum ERROR {
  ALREADY_OPENED,
  CANNOT_BE_ZERO,
}

/*
 * !scrim <type> <minutes> - open scrim countdown
 * !scrim match <matchId?> - if matchId add matchId to scrim, else list matches
 * !scrim stop             - stop scrim countdown
 */

class Scrim extends System {
  private cleanedUpOnStart: boolean = false;

  @shared()
  closingAt: number = 0;
  @shared()
  type: string = '';
  @shared()
  lastRemindAt: number = Date.now();
  @shared()
  isCooldownOnly: boolean = false;

  @settings('time')
  waitForMatchIdsInSeconds: number = 60;

  constructor() {
    super();

    if (isMainThread) {
      setInterval(() => this.reminder(), 1000);
    }
  }

  @command('!snipe')
  @default_permission(permission.CASTERS)
  public async main(opts: CommandOptions): Promise<void> {
    try {
      const [isCooldownOnly, type, minutes] = new Expects(opts.parameters)
        .toggler({name: 'c'})
        .string({name: 'type'})
        .number({name: 'minutes'})
        .toArray();
      if (this.closingAt !== 0) {
        throw Error(String(ERROR.ALREADY_OPENED));
      }  // ignore if its already opened
      if (minutes === 0) {
        throw Error(String(ERROR.CANNOT_BE_ZERO));
      }

      debug('scrim.main', `Opening new scrim cooldownOnly:${isCooldownOnly}, type:${type}, minutes:${minutes}`);

      const now = Date.now();

      this.closingAt = now + (minutes * constants.MINUTE);
      this.type = type;
      this.isCooldownOnly = isCooldownOnly;

      this.lastRemindAt = now;
      await global.db.engine.remove(this.collection.matchIds, {});

      sendMessage(
        prepare('systems.scrim.countdown', {
          type,
          time: minutes,
          unit: getLocalizedName(minutes, 'core.minutes'),
        }),
        opts.sender,
      );
    } catch (e) {
      if (isNaN(Number(e.message))) {
        sendMessage('$sender, cmd_error [' + opts.command + ']: ' + e.message, opts.sender, opts.attr);
      }
    }
  }

  @command('!snipe match')
  public async match(opts: CommandOptions): Promise<void> {
    try {
      if (opts.parameters.length === 0) {
        this.currentMatches();
      } else {
        const [matchId] = new Expects(opts.parameters).everything({name: 'matchId'}).toArray();
        await global.db.engine.update(this.collection.matchIds, { username: opts.sender.username }, { matchId });
      }
    } catch (e) {
      if (isNaN(Number(e.message))) {
        sendMessage('$sender, cmd_error [' + opts.command + ']: ' + e.message, opts.sender, opts.attr);
      }
    }
  }

  @command('!scrim stop')
  @default_permission(permission.CASTERS)
  public async stop(): Promise<void> {
    this.closingAt = 0;
    this.lastRemindAt = Date.now();

    const userObj = await global.users.getByName(getOwner());
    sendMessage(
      prepare('systems.scrim.stopped'), {
        username: userObj.username,
        displayName: userObj.displayName || userObj.username,
        userId: userObj.id,
        emotes: [],
        badges: {},
        'message-type': 'chat'
      },
    );
  }

  private async reminder() {
    if (!this.cleanedUpOnStart) {
      this.cleanedUpOnStart = true;
      this.closingAt = 0;
    } else if (this.closingAt !== 0) {
      const lastRemindAtDiffMs = -(this.lastRemindAt - Date.now());

      const minutesToGo = (this.closingAt - Date.now()) / constants.MINUTE;
      const secondsToGo = round5((this.closingAt - Date.now()) / constants.SECOND);
      const userObj = await global.users.getByName(getOwner());

      if (minutesToGo > 1) {
        // countdown every minute
        if (lastRemindAtDiffMs >= constants.MINUTE) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.type,
              time: minutesToGo.toFixed(),
              unit: getLocalizedName(minutesToGo.toFixed(), 'core.minutes'),
            }),{
              username: userObj.username,
              displayName: userObj.displayName || userObj.username,
              userId: userObj.id,
              emotes: [],
              badges: {},
              'message-type': 'chat'
            },
          );
          this.lastRemindAt = Date.now();
        }
      } else if (secondsToGo <= 60 && secondsToGo > 0) {
        // countdown every 15s
        if (lastRemindAtDiffMs >= 15 * constants.SECOND) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.type,
              time: String(secondsToGo === 60 ? 1 : secondsToGo),
              unit: secondsToGo === 60 ? getLocalizedName(1, 'core.minutes') : getLocalizedName(secondsToGo, 'core.seconds'),
            }), {
              username: userObj.username,
              displayName: userObj.displayName || userObj.username,
              userId: userObj.id,
              emotes: [],
              badges: {},
              'message-type': 'chat'
            },
          );
          this.lastRemindAt = Date.now();
        }
      } else {
        this.closingAt = 0;
        this.countdown();
      }
    }
  }

  private async currentMatches() {
    const userObj = await global.users.getByName(getOwner());
    const atUsername = global.tmi.showWithAt;
    const matches: {
      [x: string]: string[];
    } = {};
    const matchIdsFromDb = await global.db.engine.find(this.collection.matchIds);
    for (const d of matchIdsFromDb) {
      const id = d.matchId;
      if (typeof matches[id] === 'undefined') {
        matches[id] = [];
      }
      matches[id].push((atUsername ? '@' : '') + d.username);
    }
    const output: string[] = [];
    for (const id of Object.keys(matches)) {
      output.push(id + ' - ' + matches[id].join(', '));
    }
    sendMessage(
      prepare('systems.scrim.currentMatches', {
        matches: output.length === 0 ? '<' + global.translate('core.empty') + '>' : output.join(' | '),
      }),
      {
        username: userObj.username,
        displayName: userObj.displayName || userObj.username,
        userId: userObj.id,
        emotes: [],
        badges: {},
        'message-type': 'chat'
      },
    );
  }

  private async countdown() {
    const userObj = await global.users.getByName(getOwner());
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (i < 3) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.type,
              time: (3 - i) + '.',
              unit: '',
            }),
            {
              username: userObj.username,
              displayName: userObj.displayName || userObj.username,
              userId: userObj.id,
              emotes: [],
              badges: {},
              'message-type': 'chat'
            },
          );
        } else {
          this.closingAt = 0;
          sendMessage(prepare('systems.scrim.go'), {
            username: userObj.username,
            displayName: userObj.displayName || userObj.username,
            userId: userObj.id,
            emotes: [],
            badges: {},
            'message-type': 'chat'
          });
          if (!this.isCooldownOnly) {
            setTimeout(() => {
              if (this.closingAt !== 0) {
                return; // user restarted !snipe
              }
              sendMessage(
                prepare('systems.scrim.putMatchIdInChat', {
                  command: this.getCommand('!snipe match'),
                }),
                {
                  username: userObj.username,
                  displayName: userObj.displayName || userObj.username,
                  userId: userObj.id,
                  emotes: [],
                  badges: {},
                  'message-type': 'chat'
                },
              );
              setTimeout(async () => {
                if (this.closingAt !== 0) {
                  return; // user restarted !snipe
                }
                this.currentMatches();
              }, this.waitForMatchIdsInSeconds * constants.SECOND);
            }, 15 * constants.SECOND);
          }
        }
      }, (i + 1) * 1000);
    }
  }
}

export default Scrim;
export { Scrim };
