import { DateTime } from 'luxon';
import { isMainThread } from 'worker_threads';

import { getLocalizedName, getOwner, prepare, round5, sendMessage } from '../commons';
import constants from '../constants';
import { debug } from '../debug';
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
  private cleanedUpOnStart: boolean;

  constructor() {
    const options: InterfaceSettings = {
      settings: {
        _: {
          closingAt: 0,
          type: '',
          lastRemindAt: Date.now(),
          isCooldownOnly: false,
        },
        time: {
          waitForMatchIdsInSeconds: 60,
        },
        commands: [
          { name: '!snipe', permission: permission.CASTERS },
          '!snipe match',
          '!snipe stop',
        ],
      },
    };

    super(options);

    this.cleanedUpOnStart = false;

    if (isMainThread) {
      setInterval(() => this.reminder(), 1000);
    }
  }

  public async main(opts: CommandOptions): Promise<void> {
    try {
      const [isCooldownOnly, type, minutes] = new Expects(opts.parameters)
        .toggler({name: 'c'})
        .string({name: 'type'})
        .number({name: 'minutes'})
        .toArray();
      if (this.settings._.closingAt !== 0) {
        throw Error(String(ERROR.ALREADY_OPENED));
      }  // ignore if its already opened
      if (minutes === 0) {
        throw Error(String(ERROR.CANNOT_BE_ZERO));
      }

      debug('scrim.main', `Opening new scrim cooldownOnly:${isCooldownOnly}, type:${type}, minutes:${minutes}`);

      const now = Date.now();

      this.settings._.closingAt = now + (minutes * constants.MINUTE);
      this.settings._.type = type;
      this.settings._.isCooldownOnly = isCooldownOnly;

      this.settings._.lastRemindAt = now;
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
        sendMessage('$sender, cmd_error [' + opts.command + ']: ' + e.message, opts.sender);
      }
    }
  }

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
        sendMessage('$sender, cmd_error [' + opts.command + ']: ' + e.message, opts.sender);
      }
    }
  }

  public async stop(): Promise<void> {
    this.settings._.closingAt = 0;
    this.settings._lastRemindAt = Date.now();

    sendMessage(
      prepare('systems.scrim.stopped'), { username: getOwner() },
    );
  }

  private async reminder() {
    if (!this.cleanedUpOnStart) {
      this.cleanedUpOnStart = true;
      this.settings._.closingAt = 0;
    } else if (this.settings._.closingAt !== 0) {
      const when = DateTime.fromMillis(this.settings._.closingAt, { locale: global.general.settings.lang });
      const lastRemindAtDiffMs = -(DateTime.fromMillis(this.settings._.lastRemindAt).diffNow().toObject().milliseconds || 0);

      const minutesToGo = when.diffNow(['minutes']).toObject().minutes || 0;
      const secondsToGo = round5(when.diffNow(['seconds']).toObject().seconds || 0);

      if (minutesToGo > 1) {
        // countdown every minute
        if (lastRemindAtDiffMs >= constants.MINUTE) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.settings._.type,
              time: minutesToGo.toFixed(),
              unit: getLocalizedName(minutesToGo.toFixed(), 'core.minutes'),
            }),
            { username: getOwner() },
          );
          this.settings._.lastRemindAt = Date.now();
        }
      } else if (secondsToGo <= 60 && secondsToGo > 0) {
        // countdown every 15s
        if (lastRemindAtDiffMs >= 15 * constants.SECOND) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.settings._.type,
              time: String(secondsToGo === 60 ? 1 : secondsToGo),
              unit: secondsToGo === 60 ? getLocalizedName(1, 'core.minutes') : getLocalizedName(secondsToGo, 'core.seconds'),
            }),
            { username: getOwner() },
          );
          this.settings._.lastRemindAt = Date.now();
        }
      } else {
        this.settings._.closingAt = 0;
        this.countdown();
      }
    }
  }

  private async currentMatches() {
    const atUsername = global.tmi.settings.chat.showWithAt;
    const matches: {
      [x: string]: string[],
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
      { username: getOwner() },
    );
  }

  private countdown() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (i < 3) {
          sendMessage(
            prepare('systems.scrim.countdown', {
              type: this.settings._.type,
              time: (3 - i) + '.',
              unit: '',
            }),
            { username: getOwner() },
          );
        } else {
          this.settings._.closingAt = 0;
          sendMessage(prepare('systems.scrim.go'), { username: getOwner() });
          if (!this.settings._.isCooldownOnly) {
            setTimeout(() => {
              if (this.settings._.closingAt !== 0) {
                return; // user restarted !snipe
              }
              sendMessage(
                prepare('systems.scrim.putMatchIdInChat', {
                  command: this.getCommand('!snipe match'),
                }),
                { username: getOwner() },
              );
              setTimeout(async () => {
                if (this.settings._.closingAt !== 0) {
                  return; // user restarted !snipe
                }
                this.currentMatches();
              }, this.settings.time.waitForMatchIdsInSeconds * constants.SECOND);
            }, 15 * constants.SECOND);
          }
        }
      }, (i + 1) * 1000);
    }
  }
}

export default Scrim;
export { Scrim };
