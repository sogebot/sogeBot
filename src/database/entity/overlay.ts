import { Column, Entity, PrimaryColumn } from 'typeorm';

import { Alert, Filter } from './alert.js';
import { BotEntity } from '../BotEntity.js';

// expands object types recursively
type ExpandRecursively<T> = T extends object
  ? T extends infer O ? { [K in keyof O]: ExpandRecursively<O[K]> } : never
  : T;
type RemoveNull<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};
type Font = {
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
};

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
  font: Font;
  useGeneratedColors: boolean;
  useCustomUsernameColor?: boolean;
  usernameFont: Font | null;
  separatorFont: Font | null;
  separator: string;
  messageBackgroundColor: string;
  messagePadding: number;
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
  marathonFont: Font
}

export interface Stopwatch {
  typeId: 'stopwatch';
  currentTime: number;
  isPersistent: boolean;
  isStartedOnSourceLoad: boolean;
  showMilliseconds: boolean;
  stopwatchFont: Font
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
  countdownFont: Font
  messageFont: Font
}

type CreditsScreenOptions = {
  id: string;
  /** wait at the end of the screen roll */
  waitBetweenScreens: null | number ;
  /** speed of rolling */
  speed: null | 'very slow' | 'slow' | 'medium' | 'fast' | 'very fast',
  name: string,
};
type CreditsCommonOptions = {
  id: string;
  width: number;
  height: number;
  alignX: number;
  alignY: number;
  rotation: number;
};
export type CreditsScreenEvents = ExpandRecursively<{
  type: 'events',
  name: string,
  columns: number,
  excludeEvents: Alert['items'][number]['type'][],
  headers: Record<Alert['items'][number]['type'], string>,
  headerFont: ExpandRecursively<Font & {
    align: 'left' | 'center' | 'right';
    pl: number;
    pr: number;
    pt: number;
    pb: number;
  }>,
  itemFont: ExpandRecursively<Font & {
    align: 'left' | 'center' | 'right';
    pl: number;
    pr: number;
    pt: number;
    pb: number;
  }>,
  highlightFont: ExpandRecursively<Font & {
    align: 'left' | 'center' | 'right';
  }>,
} & CreditsScreenOptions>;
export type CreditsScreenClips = ExpandRecursively<{
  type: 'clips',
  play: boolean,
  period: 'custom' | 'stream',
  periodValue: number,
  numOfClips: number,
  volume: number,
  gameFont: ExpandRecursively<Font & {
    align: 'left' | 'center' | 'right';
    pl: number;
    pr: number;
    pt: number;
    pb: number;
  }>,
  titleFont: ExpandRecursively<Font & {
    align: 'left' | 'center' | 'right';
    pl: number;
    pr: number;
    pt: number;
    pb: number;
  }>,
  createdByFont: ExpandRecursively<Font & {
    align: 'left' | 'center' | 'right';
    pl: number;
    pr: number;
    pt: number;
    pb: number;
  }>,
} & CreditsScreenOptions>;

export type CreditsScreenCustom = ExpandRecursively<{
  type: 'custom',
  height: number,
  items: ExpandRecursively<{
    css: string,
    html: string,
    font: ExpandRecursively<Font & {
      align: 'left' | 'center' | 'right';
    }>,
  } & CreditsCommonOptions>[]
} & CreditsScreenOptions>;
export type Credits = ExpandRecursively<{
  typeId: 'credits';
  screens: (ExpandRecursively<CreditsScreenCustom | CreditsScreenEvents | CreditsScreenClips>)[],
} & RemoveNull<Exclude<CreditsScreenOptions, 'id'>>>;

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

export interface Media {
  typeId: 'media';
}

export interface Alerts {
  typeId: 'alerts';
  alertDelayInMs: number;
  parry: {
    enabled: boolean;
    delay: number;
  };
  profanityFilter: {
    type: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';
    list:        { [x:string]: boolean };
    customWords: string;
  };
  globalFont1: ExpandRecursively<Font & {
    align: 'left' | 'center' | 'right',
    highlightcolor: string;
  }>;
  globalFont2: ExpandRecursively<Alerts['globalFont1']>;
  tts: {
    voice: string;
    pitch: number;
    volume: number;
    rate: number;
  };
  items: ExpandRecursively<{
    id: string;
    enabled: boolean;
    name: string;
    variantName?: string | null;
    variants: ExpandRecursively<Omit<Alerts['items'][number], 'variants' | 'hooks'>>[];
    /**
     * weight of this alert, higher weight means higher priority
     */
    weight: number;
    /**
     * Hooks determinate what events will trigger this alert
     */
    hooks: string[];
    items: ExpandRecursively<AlertImage | AlertText | AlertAudio | AlertTTS | AlertCustom | AlertProfileImage>[]
    /**
     * additional hook filters
     */
    filter: Filter;
    /**
     * what rewardId should trigger this
     * available only for reward alerts
     */
    rewardId?: string;

    alertDuration: number;

    /**
     * animations
     */
    animationInWindowBoundaries?: boolean;
    animationInDuration: number;
    animationIn: 'none' | 'fadeIn' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
    | 'fadeInUp' | 'fadeInDownBig' | 'fadeInLeftBig' | 'fadeInRightBig'
    | 'fadeInUpBig' | 'bounceIn' | 'bounceInDown' | 'bounceInLeft'
    | 'bounceInRight' | 'bounceInUp' | 'flipInX' | 'flipInY' | 'lightSpeedIn'
    | 'rotateIn' | 'rotateInDownLeft' | 'rotateInDownRight' | 'rotateInUpLeft'
    | 'rotateInUpRight' | 'slideInDown' | 'slideInLeft' | 'slideInRight'
    | 'slideInUp' | 'zoomIn' | 'zoomInDown' | 'zoomInLeft' | 'zoomInRight'
    | 'zoomInUp' | 'rollIn' | 'jackInTheBox';
    animationOutWindowBoundaries?: boolean;
    animationOutDuration: number;
    animationOut: 'none' | 'fadeOut' | 'fadeOutDown' | 'fadeOutLeft' | 'fadeOutRight' | 'fadeOutUp'
    | 'fadeOutDownBig' | 'fadeOutLeftBig' | 'fadeOutRightBig' | 'fadeOutUpBig'
    | 'bounceOut' | 'bounceOutDown' | 'bounceOutLeft' | 'bounceOutRight'
    | 'bounceOutUp' | 'flipOutX' | 'flipOutY' | 'lightSpeedOut' | 'rotateOut'
    | 'rotateOutDownLeft' | 'rotateOutDownRight' | 'rotateOutUpLeft'
    | 'rotateOutUpRight' | 'slideOutDown' | 'slideOutLeft' | 'slideOutRight'
    | 'slideOutUp' | 'zoomOut' | 'zoomOutDown' | 'zoomOutLeft' | 'zoomOutRight'
    | 'zoomOutUp' | 'rollOut';
    animationText: 'none' | 'baffle' | 'bounce' | 'bounce2' | 'flip' | 'flash' | 'pulse2' | 'rubberBand'
    | 'shake2' | 'swing' | 'tada' | 'wave' | 'wobble' | 'wiggle' | 'wiggle2' | 'jello' | 'typewriter';
    animationTextOptions: {
      speed: 'slower' | 'slow' | 'normal' |  'fast' | 'faster';
      maxTimeToDecrypt: number;
      characters: string;
    };
  }>[];
}

type AlertCommonOptions = ExpandRecursively<CreditsCommonOptions>;

export type AlertAnimationOptions = {
  animationDelay: number;
  animationInDuration: null | number;
  animationOutDuration: null | number;
  animationIn: null | Alerts['items'][number]['animationIn'];
  animationOut: null | Alerts['items'][number]['animationOut'];
};

export type AlertAudio = ExpandRecursively<AlertCommonOptions & {
  type: 'audio';
  galleryId: string;
  volume: number;
  delay: number;
}>;

export type AlertProfileImage = ExpandRecursively<AlertCommonOptions & AlertAnimationOptions & {
  type: 'profileImage';
}>;

export type AlertImage = ExpandRecursively<AlertCommonOptions & AlertAnimationOptions & {
  type: 'gallery';
  galleryId: string;
  loop: boolean;
  volume: number;
  isVideo: boolean;
}>;

export type AlertTTS = ExpandRecursively<AlertCommonOptions & {
  type: 'tts';
  tts: null | Alerts['tts'];
  ttsTemplate: string;
  enabledWhen: Filter;
  speakDelay?: number;
}>;

export type AlertCustom = ExpandRecursively<AlertCommonOptions & {
  type: 'custom';
  css: string;
  html: string;
  javascript: string;
  globalFont: 'globalFont1' | 'globalFont2';
  font: null | Alerts['globalFont1'];
  enabledWhen: Filter;
  allowEmotes:     {
    twitch: boolean, ffz: boolean, bttv: boolean,
  },
}>;

export type AlertText = ExpandRecursively<AlertCommonOptions & AlertAnimationOptions & {
  type: 'text';
  globalFont: 'globalFont1' | 'globalFont2';
  font: null | Alerts['globalFont1'];
  messageTemplate: string;
  enabledWhen: Filter;
  allowEmotes:     {
    twitch: boolean, ffz: boolean, bttv: boolean,
  },
}>;
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

export interface Plugin {
  typeId: 'plugin';
  pluginId: string;
  overlayId: string;
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
export class Overlay extends BotEntity {
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
    ClipsCarousel | HypeTrain | Wordcloud | HTML | Stats | Randomizer | Goal | Credits |
    Plugin | Media;
  }[];
}