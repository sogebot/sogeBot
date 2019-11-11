import { isMainThread } from '../cluster';

import { getBotSender, getLocalizedName, prepare, round5, sendMessage } from '../commons';
import * as constants from '../constants';
import { debug } from '../helpers/log';
import { command, default_permission, settings, shared } from '../decorators';
import Expects from '../expects.js';
import { permission } from '../permissions';
import System from './_interface';
import { getRepository } from 'typeorm';
import { ScrimMatchId } from '../entity/scrimMatchId';

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
  private cleanedUpOnStart = false;

  @shared()
  closingAt = 0;
  @shared()
  type = '';
  @shared()
  lastRemindAt: number = Date.now();
  @shared()
  isCooldownOnly = false;

  @settings('time')
  waitForMatchIdsInSeconds = 60;

  constructor() {
    super();

    if (isMainThread) {
      this.reminder();
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
      await getRepository(ScrimMatchId).clear();

      sendMessage(
        prepare('systems.scrim.countdown', {
          type,
          time: minutes,
          unit: getLocalizedName(minutes, 'core.minutes'),
        }),
        getBotSender(),
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
        let scrimMatchId = await getRepository(ScrimMatchId).findOne({ username: opts.sender.username});
        if (!scrimMatchId) {
          scrimMatchId = new ScrimMatchId();
          scrimMatchId.username = opts.sender.username;
        }
        scrimMatchId.matchId = matchId;
        await getRepository(ScrimMatchId).save(scrimMatchId);
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
    sendMessage(
      prepare('systems.scrim.stopped'), {
        username: global.oauth.botUsername,
        displayName: global.oauth.botUsername,
        userId: Number(global.oauth.botId),
        emotes: [],
        badges: {},
        'message-type': 'chat',
      },
    );
  }

  private reminder() {
    if (!this.cleanedUpOnStart) {
      this.cleanedUpOnStart = true;
      this.closingAt = 0;
    } else if (this.closingAt !== 0) {
      const lastRemindAtDiffMs = -(this.lastRemindAt - Date.now());

      const minutesToGo = (this.closingAt - Date.now()) / constants.MINUTE;
      const secondsToGo = round5((this.closingAt - Date.now()) / constants.SECOND);

      if (minutesToGo > 1) {
        // countdown every minute
        if (lastRemindAtDiffMs >= constants.MINUTE) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.type,
              time: minutesToGo.toFixed(),
              unit: getLocalizedName(minutesToGo.toFixed(), 'core.minutes'),
            }), getBotSender(),
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
            }), getBotSender(),
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
    const atUsername = global.tmi.showWithAt;
    const matches: {
      [x: string]: string[];
    } = {};
    const matchIdsFromDb = await getRepository(ScrimMatchId).find();
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
      getBotSender(),
    );
  }

  private countdown() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (i < 3) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.type,
              time: (3 - i) + '.',
              unit: '',
            }),
            getBotSender(),
          );
        } else {
          this.closingAt = 0;
          sendMessage(prepare('systems.scrim.go'), getBotSender());
          if (!this.isCooldownOnly) {
            setTimeout(() => {
              if (this.closingAt !== 0) {
                return; // user restarted !snipe
              }
              sendMessage(
                prepare('systems.scrim.putMatchIdInChat', {
                  command: this.getCommand('!snipe match'),
                }),
                getBotSender(),
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
