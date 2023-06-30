import { Column, Entity, PrimaryColumn } from 'typeorm';

import { Alert } from './alert';
import { BotEntity } from '../BotEntity';

export interface Reference {
  typeId: 'reference',
  overlayId: string;
  groupId: string;
}

export interface Randomizer {
  typeId: 'randomizer',
}

export interface Chat {
  typeId: 'chat';
  type: 'vertical' | 'horizontal' | 'niconico';
  hideMessageAfter: number;
  showCommandMessages: boolean,
  showTimestamp: boolean;
  reverseOrder: boolean;
  showBadges: boolean;
  useCustomLineHeight: boolean;
  customLineHeight: number;
  useCustomBadgeSize: boolean;
  customBadgeSize: number;
  useCustomEmoteSize: boolean;
  customEmoteSize: number;
  useCustomSpaceBetweenMessages: boolean;
  customSpaceBetweenMessages: number;
  font: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  }
}

export interface Marathon {
  typeId: 'marathon';
  disableWhenReachedZero: boolean;
  showProgressGraph: boolean;
  endTime: number;
  maxEndTime: number | null;
  showMilliseconds: boolean;
  values: {
    sub: {
      tier1: number;
      tier2: number;
      tier3: number;
    },
    resub: {
      tier1: number;
      tier2: number;
      tier3: number;
    },
    bits: {
      /*
         * true:  value:bits is set to 10 and we got 15 -> 1.5x value will get added
         * false: value:bits is set to 10 and we got 15 -> 1.0x value will get added
         */
      addFraction: boolean;
      bits: number;
      time: number;
    },
    tips: {
      /*
         * true:  value:tip is set to 10 and we got 15 -> 1.5x value will get added
         * false: value:tip is set to 10 and we got 15 -> 1.0x value will get added
         */
      addFraction: boolean;
      tips: number;
      time: number;
    },
  }
  marathonFont: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  }
}

export interface Stopwatch {
  typeId: 'stopwatch';
  currentTime: number;
  isPersistent: boolean;
  isStartedOnSourceLoad: boolean;
  showMilliseconds: boolean;
  stopwatchFont: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  }
}

export interface Wordcloud {
  typeId: 'wordcloud';
  fadeOutInterval: number;
  fadeOutIntervalType: 'seconds' | 'minutes' | 'hours';
  wordFont: {
    family: string;
    weight: number;
    color: string;
  }
}

export interface Countdown {
  typeId: 'countdown';
  time: number;
  currentTime: number;
  isPersistent: boolean;
  isStartedOnSourceLoad: boolean;
  messageWhenReachedZero: string;
  showMessageWhenReachedZero: boolean;
  showMilliseconds: boolean;
  countdownFont: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  }
  messageFont: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  }
}

type CreditsCommonOptions = {
  id: string;
  /** wait at the end of the screen roll */
  waitBetweenScreens: null | number ;
  /** specifies space between screens
   * - number is pixels
   * - full-screen-between is height of the visible part
   * - none shows next screen immediately
  */
  spaceBetweenScreens: null | number | 'full-screen-between' | 'none';
  /** speed of rolling */
  speed: null | 'very slow' | 'slow' | 'medium' | 'fast' | 'very fast',
};
// expands object types recursively
type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T;
type RemoveNull<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};
type CreditsScreenTitle = ExpandRecursively<{
  type: 'title',
  height: number;
} & CreditsCommonOptions>;
type CreditsScreenEvents = ExpandRecursively<{
  type: 'events',
  columns: number,
  excludeEvents: Alert['items'][number]['type'][]
} & CreditsCommonOptions>;
type CreditsScreenText = ExpandRecursively<{
  type: 'text',
  html: string,
  css: string,
} & CreditsCommonOptions>;
type CreditsScreenSocial = ExpandRecursively<{
  type: 'social',
  items: {
    type: string, text: string;
  }[]
} & CreditsCommonOptions>;
type CreditsScreenClips = ExpandRecursively<{
  type: 'clips',
  play: boolean,
  period: 'custom' | 'stream',
  periodValue: number,
  numOfClips: number,
  volume: number,
} & CreditsCommonOptions>;
export type Credits = ExpandRecursively<{
  typeId: 'credits';
  screens: (CreditsScreenText | CreditsScreenClips | CreditsScreenSocial | CreditsScreenEvents | CreditsScreenTitle)[],
} & RemoveNull<Exclude<CreditsCommonOptions, 'id'>>>;
export interface Eventlist {
  typeId: 'eventlist';
  count: number,
  ignore: string[]
  display: string[],
  order: 'asc' | 'desc',
  /** set item fadeout */
  fadeOut: boolean,
  /** set eventlist horizontal */
  inline: boolean,
  /** space between two event items */
  spaceBetweenItems: number,
  /** space between event and username of one item */
  spaceBetweenEventAndUsername: number,
  usernameFont: {
    align: 'left' | 'center' | 'right';
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  }
  eventFont: {
    align: 'left' | 'center' | 'right';
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  }
}

export interface Clips {
  typeId: 'clips';
  volume: number,
  filter: 'none' | 'grayscale' | 'sepia' | 'tint' | 'washed',
  showLabel: boolean,
}

export interface Alerts {
  typeId: 'media';
  galleryCache: boolean,
  galleryCacheLimitInMb: number,
}

export interface Emotes {
  typeId: 'emotes';
  emotesSize: 1 | 2 | 3,
  maxEmotesPerMessage: number,
  animation: 'fadeup' | 'fadezoom' | 'facebook',
  animationTime: number,
  maxRotation: number,
  offsetX: number,
}

export interface EmotesCombo {
  typeId: 'emotescombo';
  showEmoteInOverlayThreshold: number,
  hideEmoteInOverlayAfter: number,
}

export interface EmotesFireworks {
  typeId: 'emotesfireworks';
  emotesSize: 1 | 2 | 3,
  animationTime: number,
  numOfEmotesPerExplosion: number,
  numOfExplosions: number,
}
export interface EmotesExplode {
  typeId: 'emotesexplode';
  emotesSize: 1 | 2 | 3,
  animationTime: number,
  numOfEmotes: number,
}
export interface Carousel {
  typeId: 'carousel';
  images: {
    waitBefore: number;
    waitAfter: number;
    duration: number;
    animationInDuration: number;
    animationIn: string;
    animationOutDuration: number;
    animationOut: string;
    url: string;
    id: string;
  }[]
}

export interface HypeTrain {
  typeId: 'hypetrain';
}

export interface ClipsCarousel {
  typeId: 'clipscarousel';
  customPeriod: number,
  numOfClips: number,
  volume: number,
  animation: string,
  spaceBetween: number,
}

export interface TTS {
  typeId: 'tts';
  voice: string,
  volume: number,
  rate: number,
  pitch: number,
  triggerTTSByHighlightedMessage: boolean,
}

export interface Polls {
  typeId: 'polls';
  theme: 'light' | 'dark' | 'Soge\'s green',
  hideAfterInactivity: boolean,
  inactivityTime: number,
  align: 'top' | 'bottom',
}

export interface OBSWebsocket {
  typeId: 'obswebsocket';
  allowedIPs: string[];
  port: string;
  password: string;
}

export interface AlertsRegistry {
  typeId: 'alertsRegistry' | 'textRegistry';
  id: string,
}

export interface URL {
  typeId: 'url';
  url: string,
}

export interface HTML {
  typeId: 'html';
  html: string;
  javascript: string;
  css: string;
}

export interface Goal {
  typeId: 'goal';
  display: {
    type: 'fade';
    durationMs: number;
    animationInMs: number;
    animationOutMs: number;
  } | {
    type: 'multi';
    spaceBetweenGoalsInPx: number;
  };
  campaigns: {
    name: string;
    type:
    'followers' | 'currentFollowers' | 'currentSubscribers'
    | 'subscribers' | 'tips' | 'bits' | 'intervalSubscribers'
    | 'intervalFollowers' | 'intervalTips' | 'intervalBits' | 'tiltifyCampaign';
    countBitsAsTips: boolean;
    display: 'simple' | 'full' | 'custom';
    timestamp?: string;
    tiltifyCampaign?: number | null,
    interval?: 'hour' | 'day' | 'week' | 'month' | 'year';
    goalAmount?: number;
    currentAmount?: number;
    endAfter: string;
    endAfterIgnore: boolean;
    customization: {
      html: string;
      js: string;
      css: string;
    };
    customizationBar: {
      color: string;
      backgroundColor: string;
      borderColor: string;
      borderPx: number;
      height: number;
    };
    customizationFont: {
      family: string;
      color: string;
      size: number;
      weight: number;
      borderColor: string;
      borderPx: number;
      shadow: {
        shiftRight: number;
        shiftDown: number;
        blur: number;
        opacity: number;
        color: string;
      }[];
    };
  }[];
}

export interface Stats {
  typeId: 'stats';
}

export interface Group {
  typeId: 'group';
  canvas: {
    width: number;
    height: number;
  },
  items: {
    id: string;
    width: number;
    height: number;
    alignX: number;
    alignY: number;
  }[],
}

@Entity()
export class Overlay extends BotEntity<Overlay> {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
    name: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    canvas: {
    width: number;
    height: number;
  };

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    items: {
    id: string;
    isVisible: boolean;
    width: number;
    height: number;
    alignX: number;
    alignY: number;
    rotation: number;
    name: string;
    opts:
    URL | Chat | Reference | AlertsRegistry | Carousel | Marathon | Stopwatch |
    Countdown | Group | Eventlist | EmotesCombo | Credits | Clips | Alerts |
    Emotes | EmotesExplode | EmotesFireworks | Polls | TTS | OBSWebsocket |
    ClipsCarousel | HypeTrain | Wordcloud | HTML | Stats | Randomizer | Goal | Credits;
  }[];
}

// @Entity({ name: "overlay" })
// export class OverlayPlus extends BotEntity<OverlayPlus> {
//   @PrimaryColumn({ generated: 'uuid' })
//     id: string;

//   @Column()
//     name: string;

//   @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
//     canvas: {
//     width: number;
//     height: number;
//   };

//   @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
//     items: ({
//     id: string;
//     version: 2;
//     isVisible: boolean;
//     width: number;
//     height: number;
//     alignX: number;
//     alignY: number;
//     rotation: number;
//     name: string;
//     state: {
//       default: {
//         box: {
//           width: number;
//           height: number;
//           alignX: number;
//           alignY: number;
//           rotation: number;
//           anchorPos: 'left-top' | 'left-center' | 'left-bottom'
//           | 'center-top' | 'center-center' | 'center-bottom'
//           | 'right-top' | 'right-right' | 'center-bottom',
//         }
//         // filter to show based on e.g. follower count, game etc.
//         filter: string,
//         animation: {
//           // animation in is triggered on state show
//           animationInDuration: number;
//           animationIn: 'fadeIn';
//           animationInDelay: number;
//           // animation out is triggered on state change (on state hide)
//           animationOutDuration: number;
//           animationOut: 'fadeOut';
//           animationOutDelay: number;
//         }
//         automation: {
//           // next state, if same as current state, do nothing
//           goTo: string;
//           // how long to change to next state
//           delay: number;
//         }
//         // we just support text item for now
//         item: {
//           text: string;
//           animationText: 'none' | 'baffle' | 'bounce' | 'bounce2' | 'flip' | 'flash' | 'pulse2' | 'rubberBand'
//           | 'shake2' | 'swing' | 'tada' | 'wave' | 'wobble' | 'wiggle' | 'wiggle2' | 'jello' | 'typewriter';
//           animationTextOptions: {
//             speed: number | 'slower' | 'slow' | 'fast' | 'faster';
//             maxTimeToDecrypt: number;
//             characters: string;
//           };
//           font: {
//             family: string;
//             size: number;
//             borderPx: number;
//             borderColor: string;
//             weight: number;
//             color: string;
//             shadow: {
//               shiftRight: number;
//               shiftDown: number;
//               blur: number;
//               opacity: number;
//               color: string;
//             }[];
//           }
//         }
//       }[]
//     }
//   })[];
// }