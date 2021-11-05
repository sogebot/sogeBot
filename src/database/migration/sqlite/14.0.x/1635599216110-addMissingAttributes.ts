import { defaultsDeep } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export class addMissingAttributes1635599216110 implements MigrationInterface {
  name = 'addMissingAttributes1635599216110';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query('SELECT * FROM overlay_mapper', undefined);
    for (const item of items) {
      let opts: Record<string, any> = {};
      if (item.opts) {
        opts = JSON.parse(item.opts);
      }
      if(['clips'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          volume:    0,
          filter:    'none',
          showLabel: true,
        });
      }
      if(['clipscarousel'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          volume:       0,
          customPeriod: 31,
          numOfClips:   20,
        });
      }
      if(['countdown'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          time:                       60000,
          currentTime:                60000,
          isPersistent:               false,
          isStartedOnSourceLoad:      true,
          showMilliseconds:           false,
          messageWhenReachedZero:     '',
          showMessageWhenReachedZero: false,
          countdownFont:              {
            family:      'PT Sans',
            size:        50,
            borderPx:    1,
            borderColor: '#000000',
            weight:      '500',
            color:       '#ffffff',
            shadow:      [],
          },
          messageFont: {
            family:      'PT Sans',
            size:        35,
            borderPx:    1,
            borderColor: '#000000',
            weight:      '500',
            color:       '#ffffff',
            shadow:      [],
          },
        });
      }
      if(['credits'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          speed:       'medium',
          customTexts: [],
          social:      [],
          clips:       {
            play:        true,
            period:      'custom',
            periodValue: 31,
            numOfClips:  3,
            volume:      20,
          },
          text: {
            lastMessage:      'Thanks for watching',
            lastSubMessage:   '~ see you on the next stream ~',
            streamBy:         'Stream by',
            follow:           'Followed by',
            host:             'Hosted by',
            raid:             'Raided by',
            cheer:            'Cheered by',
            sub:              'Subscribed by',
            resub:            'Resubscribed by',
            subgift:          'Subgifts by',
            subcommunitygift: 'Community subgifts by',
            tip:              'Tips by',
          },
          show: {
            follow:           true,
            host:             true,
            raid:             true,
            sub:              true,
            subgift:          true,
            subcommunitygift: true,
            resub:            true,
            cheer:            true,
            clips:            true,
            tip:              true,
          },
        });
      }
      if(['emotes'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          emotesSize:          3,
          animation:           'fadeup',
          animationTime:       1000,
          maxEmotesPerMessage: 5,
        });
      }
      if(['emotescombo'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          showEmoteInOverlayThreshold: 3,
          hideEmoteInOverlayAfter:     30,
        });
      }
      if(['emotesexplode'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          emotesSize:    3,
          animationTime: 1000,
          numOfEmotes:   5,
        });
      }
      if(['emotesfireworks'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          emotesSize:              3,
          numOfEmotesPerExplosion: 10,
          animationTime:           1000,
          numOfExplosions:         5,
        });
      }
      if(['eventlist'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          display: ['username', 'event'],
          ignore:  [],
          count:   5,
          order:   'desc',
        });
      }
      if(['emotescombo'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          showEmoteInOverlayThreshold: 3,
          hideEmoteInOverlayAfter:     30,
        });
      }
      if(['group'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          canvas: {
            height: 1080,
            width:  1920,
          },
          items: [],
        });
      }
      if(['marathon'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          showProgressGraph:      false,
          disableWhenReachedZero: true,
          endTime:                Date.now(),
          maxEndTime:             null,
          showMilliseconds:       false,
          values:                 {
            sub: {
              tier1: (10 * MINUTE) / SECOND,
              tier2: (15 * MINUTE) / SECOND,
              tier3: (20 * MINUTE) / SECOND,
            },
            resub: {
              tier1: (5 * MINUTE) / SECOND,
              tier2: (7.5 * MINUTE) / SECOND,
              tier3: (10 * MINUTE) / SECOND,
            },
            bits: {
              addFraction: true,
              bits:        100,
              time:        MINUTE / SECOND,
            },
            tips: {
              addFraction: true,
              tips:        1,
              time:        MINUTE / SECOND,
            },
          },
          marathonFont: {
            family:      'PT Sans',
            size:        50,
            borderPx:    1,
            borderColor: '#000000',
            weight:      '500',
            color:       '#ffffff',
            shadow:      [],
          },
        });
      }
      if(['alert'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          galleryCache:          false,
          galleryCacheLimitInMb: 50,
        });
      }
      if(['obswebsocket'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, { allowedIPs: [] });
      }
      if(['polls'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          theme:               'light',
          hideAfterInactivity: false,
          inactivityTime:      5000,
          align:               'top',
        });
      }
      if(['stopwatch'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          currentTime:           0,
          isPersistent:          false,
          isStartedOnSourceLoad: true,
          showMilliseconds:      true,
          stopwatchFont:         {
            family:      'PT Sans',
            size:        50,
            borderPx:    1,
            borderColor: '#000000',
            weight:      '500',
            color:       '#ffffff',
            shadow:      [],
          },
        });
      }
      if(['tts'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          voice:                          'UK English Female',
          volume:                         50,
          rate:                           1,
          pitch:                          1,
          triggerTTSByHighlightedMessage: false,
        });
      }

      const keys = Object.keys(item);
      item.opts = JSON.stringify(opts);
      await queryRunner.query('DELETE FROM "overlay_mapper" WHERE "id"=\'' + item.id + '\'');
      await queryRunner.query(`INSERT INTO "overlay_mapper"(${keys.map(o => `${o}`).join(', ')}) values (${keys.map(o => `'${item[o]}'`).join(', ')})`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
