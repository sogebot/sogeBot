import { ScrimMatchId } from '@entity/scrimMatchId.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';

import System from './_interface.js';
import { onStartup } from '../decorators/on.js';
import {
  command, default_permission, settings,
} from '../decorators.js';
import { Expects } from  '../expects.js';

import { AppDataSource } from '~/database.js';
import { announce } from '~/helpers/commons/announce.js';
import { getUserSender } from '~/helpers/commons/index.js';
import { prepare } from '~/helpers/commons/prepare.js';
import { round5 } from '~/helpers/commons/round5.js';
import { debug } from '~/helpers/log.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import getBotId from '~/helpers/user/getBotId.js';
import getBotUserName from '~/helpers/user/getBotUserName.js';
import twitch from '~/services/twitch.js';
import { translate } from '~/translate.js';

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

  closingAt = 0;
  type = '';
  lastRemindAt: number = Date.now();
  isCooldownOnly = false;

  @settings('customization')
    waitForMatchIdsInSeconds = 60;

  @onStartup()
  onStartup() {
    this.reminder();
    setInterval(() => this.reminder(), 250);
  }

  @command('!snipe')
  @default_permission(defaultPermissions.CASTERS)
  public async main(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [isCooldownOnly, type, minutes] = new Expects(opts.parameters)
        .toggler({ name: 'c' })
        .string({ name: 'type' })
        .number({ name: 'minutes' })
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
      await AppDataSource.getRepository(ScrimMatchId).clear();
      announce(prepare('systems.scrim.countdown', {
        type,
        time: minutes,
        unit: getLocalizedName(minutes, translate('core.minutes')),
      }), 'scrim');
      return [];
    } catch (e: any) {
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
        const [matchId] = new Expects(opts.parameters).everything({ name: 'matchId' }).toArray();
        const scrimMatchId = await AppDataSource.getRepository(ScrimMatchId).findOneBy({ username: opts.sender.userName });
        await AppDataSource.getRepository(ScrimMatchId).save({
          ...scrimMatchId,
          username: opts.sender.userName,
          matchId,
        });
      }
    } catch (e: any) {
      if (isNaN(Number(e.message))) {
        return [{ response: '$sender, cmd_error [' + opts.command + ']: ' + e.message, ...opts }];
      }
    }
    return [];
  }

  @command('!scrim stop')
  @default_permission(defaultPermissions.CASTERS)
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
            unit: getLocalizedName(minutesToGo.toFixed(), translate('core.minutes')),
          }), 'scrim');
          this.lastRemindAt = Date.now();
        }
      } else if (secondsToGo <= 60 && secondsToGo > 0) {
        // countdown every 15s
        if (lastRemindAtDiffMs >= 15 * constants.SECOND) {
          announce(prepare('systems.scrim.countdown', {
            type: this.type,
            time: String(secondsToGo === 60 ? 1 : secondsToGo),
            unit: secondsToGo === 60 ? getLocalizedName(1, translate('core.minutes')) : getLocalizedName(secondsToGo, translate('core.seconds')),
          }), 'scrim');
          this.lastRemindAt = Date.now();
        }
      } else {
        this.closingAt = 0;
        this.countdown();
      }
    }
  }

  private async currentMatches(opts: CommandOptions): Promise<CommandResponse[]> {
    const atUsername = twitch.showWithAt;
    const matches: {
      [x: string]: string[];
    } = {};
    const matchIdsFromDb = await AppDataSource.getRepository(ScrimMatchId).find();
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
    return [{ response: prepare('systems.scrim.currentMatches', { matches: output.length === 0 ? '<' + translate('core.empty') + '>' : output.join(' | ') }), ...opts }];
  }

  async countdown() {
    await Promise.all([...Array(4)].map((_, i) => {
      return new Promise(resolve => {
        setTimeout(() => {
          announce(
            prepare('systems.scrim.countdown', {
              type: this.type,
              time: (3 - i) + '.',
              unit: '',
            }), 'scrim');
          resolve(true);
        }, (i + 1) * 1000);
      });
    }));

    this.closingAt = 0;
    announce(prepare('systems.scrim.go'), 'scrim');
    if (!this.isCooldownOnly) {
      setTimeout(() => {
        if (this.closingAt !== 0) {
          return; // user restarted !snipe
        }
        announce(
          prepare('systems.scrim.putMatchIdInChat', { command: this.getCommand('!snipe match') }), 'scrim',
        );
        setTimeout(async () => {
          if (this.closingAt !== 0) {
            return; // user restarted !snipe
          }
          const currentMatches = await this.currentMatches({
            sender: getUserSender(getBotId(), getBotUserName()), parameters: '', createdAt: Date.now(), command: '', attr: {}, isAction: false, isHighlight: false, emotesOffsets: new Map(), isFirstTimeMessage: false, discord: undefined,
          });
          for (const r of currentMatches) {
            announce(await r.response, 'scrim');
          }
        }, this.waitForMatchIdsInSeconds * constants.SECOND);
      }, 15 * constants.SECOND);
    }
  }
}

export default new Scrim();
