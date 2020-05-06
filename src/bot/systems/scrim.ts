import { isMainThread } from '../cluster';

import { announce, getBotSender, getLocalizedName, prepare, round5 } from '../commons';
import * as constants from '../constants';
import { debug } from '../helpers/log';
import { command, default_permission, settings, shared } from '../decorators';
import Expects from '../expects.js';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { getRepository } from 'typeorm';
import { ScrimMatchId } from '../database/entity/scrimMatchId';
import { translate } from '../translate';
import tmi from '../tmi';

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
  public async main(opts: CommandOptions): Promise<CommandResponse[]> {
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
      announce(prepare('systems.scrim.countdown', {
        type,
        time: minutes,
        unit: getLocalizedName(minutes, 'core.minutes'),
      }));
      return [];
    } catch (e) {
      if (isNaN(Number(e.message))) {
        return [{ response: '$sender, cmd_error [' + opts.command + ']: ' + e.message, ...opts }];
      }
    }
    return [];
  }

  @command('!snipe match')
  public async match(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      if (opts.parameters.length === 0) {
        return this.currentMatches(opts);
      } else {
        const [matchId] = new Expects(opts.parameters).everything({name: 'matchId'}).toArray();
        const scrimMatchId = await getRepository(ScrimMatchId).findOne({ username: opts.sender.username});
        await getRepository(ScrimMatchId).save({
          ...scrimMatchId,
          username: opts.sender.username,
          matchId,
        });
      }
    } catch (e) {
      if (isNaN(Number(e.message))) {
        return [{ response: '$sender, cmd_error [' + opts.command + ']: ' + e.message, ...opts }];
      }
    }
    return [];
  }

  @command('!scrim stop')
  @default_permission(permission.CASTERS)
  public async stop(opts: CommandOptions): Promise<CommandResponse[]> {
    this.closingAt = 0;
    this.lastRemindAt = Date.now();
    return [{ response: prepare('systems.scrim.stopped'), ...opts }];
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
          announce(prepare('systems.scrim.countdown', {
            type: this.type,
            time: minutesToGo.toFixed(),
            unit: getLocalizedName(minutesToGo.toFixed(), 'core.minutes'),
          }));
          this.lastRemindAt = Date.now();
        }
      } else if (secondsToGo <= 60 && secondsToGo > 0) {
        // countdown every 15s
        if (lastRemindAtDiffMs >= 15 * constants.SECOND) {
          announce(prepare('systems.scrim.countdown', {
            type: this.type,
            time: String(secondsToGo === 60 ? 1 : secondsToGo),
            unit: secondsToGo === 60 ? getLocalizedName(1, 'core.minutes') : getLocalizedName(secondsToGo, 'core.seconds'),
          }));
          this.lastRemindAt = Date.now();
        }
      } else {
        this.closingAt = 0;
        this.countdown();
      }
    }
  }

  private async currentMatches(opts: CommandOptions): Promise<CommandResponse[]> {
    const atUsername = tmi.showWithAt;
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
    for (const id of Object.keys(matches).sort()) {
      output.push(id + ' - ' + matches[id].sort().join(', '));
    }
    return [{
      response: prepare('systems.scrim.currentMatches', {
        matches: output.length === 0 ? '<' + translate('core.empty') + '>' : output.join(' | '),
      }), ...opts }];
  }

  private countdown() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (i < 3) {
          announce(
            prepare('systems.scrim.countdown', {
              type: this.type,
              time: (3 - i) + '.',
              unit: '',
            }));
        } else {
          this.closingAt = 0;
          announce(prepare('systems.scrim.go'));
          if (!this.isCooldownOnly) {
            setTimeout(() => {
              if (this.closingAt !== 0) {
                return; // user restarted !snipe
              }
              announce(
                prepare('systems.scrim.putMatchIdInChat', {
                  command: this.getCommand('!snipe match'),
                })
              );
              setTimeout(async () => {
                if (this.closingAt !== 0) {
                  return; // user restarted !snipe
                }
                const currentMatches = await this.currentMatches({ sender: getBotSender(), parameters: '', createdAt: Date.now(), command: '', attr: {} });
                for (const r of currentMatches) {
                  announce(await r.response);
                }
              }, this.waitForMatchIdsInSeconds * constants.SECOND);
            }, 15 * constants.SECOND);
          }
        }
      }, (i + 1) * 1000);
    }
  }
}

export default new Scrim();
