import { EntitySchema } from 'typeorm';

export interface OverlayMapperInterface {
  id: string;
  value: string | null;
  opts: null
}

export interface OverlayMapperCountdown {
  id: string;
  value: 'countdown';
  opts: null | {
    time: number;
    messageWhenReachedZero: string;
    showMessageWhenReachedZero: boolean;
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
  },
}

export interface OverlayMapperCredits {
  id: string;
  value: 'credits';
  opts: null | {
    social: {
      type: string, text: string;
    }[],
    speed: 'very slow' | 'slow' | 'medium' | 'fast' | 'very fast',
    customTexts: {
      type: 'bigHeader' | 'header' | 'text' | 'smallText' | 'separator',
      left: string,
      middle: string,
      right: string,
    }[],
    clips: {
      play: boolean,
      period: 'custom' | 'stream',
      periodValue: number,
      numOfClips: number,
      volume: number,
    },
    text:  {
      lastMessage:      string,
      lastSubMessage:   string,
      streamBy:         string,
      follow:           string,
      host:             string,
      raid:             string,
      cheer:            string,
      sub:              string,
      resub:            string,
      subgift:          string,
      subcommunitygift: string,
      tip:              string,
    },
    show: {
      follow:           boolean,
      host:             boolean,
      raid:             boolean,
      sub:              boolean,
      subgift:          boolean,
      subcommunitygift: boolean,
      resub:            boolean,
      cheer:            boolean,
      clips:            boolean,
      tip:              boolean,
    }
  },
}
export interface OverlayMapperEventlist {
  id: string;
  value: 'eventlist';
  opts: null | {
    count: number,
    ignore: string[]
    display: string[],
    order: 'asc' | 'desc',
  },
}

export interface OverlayMapperClips {
  id: string;
  value: 'clips';
  opts: null | {
    volume: number,
    filter: 'none' | 'grayscale' | 'sepia' | 'tint' | 'washed',
    showLabel: boolean,
  },
}

export interface OverlayMapperAlerts {
  id: string;
  value: 'alerts';
  opts: null | {
    galleryCache: boolean,
    galleryCacheLimitInMb: number,
  },
}

export interface OverlayMapperEmotes {
  id: string;
  value: 'emotes';
  opts: null | {
    emotesSize: 1 | 2 | 3,
    maxEmotesPerMessage: number,
    animation: 'fadeup' | 'fadezoom' | 'facebook',
    animationTime: number,
  },
}

export interface OverlayMapperEmotesCombo {
  id: string;
  value: 'emotescombo';
  opts: null | {
    showEmoteInOverlayThreshold: number,
    hideEmoteInOverlayAfter: number,
  },
}

export interface OverlayMapperEmotesFireworks {
  id: string;
  value: 'emotesfireworks';
  opts: null | {
    emotesSize: 1 | 2 | 3,
    animationTime: number,
    numOfEmotesPerExplosion: number,
    numOfExplosions: number,
  },
}
export interface OverlayMapperEmotesExplode {
  id: string;
  value: 'emotesexplode';
  opts: null | {
    emotesSize: 1 | 2 | 3,
    animationTime: number,
    numOfEmotes: number,
  },
}

export interface OverlayMapperHypeTrain {
  id: string;
  value: 'hypetrain';
  opts: null
}

export interface OverlayMapperClipsCarousel {
  id: string;
  value: 'clipscarousel';
  opts: null | {
    customPeriod: number,
    numOfClips: number,
    volume: number,
  },
}

export interface OverlayMapperTTS {
  id: string;
  value: 'tts';
  opts: null | {
    voice: string,
    volume: number,
    rate: number,
    pitch: number,
    triggerTTSByHighlightedMessage: boolean,
  },
}

export interface OverlayMapperPolls {
  id: string;
  value: 'polls';
  opts: null | {
    theme: 'light' | 'dark' | 'Soge\'s green',
    hideAfterInactivity: boolean,
    inactivityTime: number,
    align: 'top' | 'bottom',
  },
}

export interface OverlayMapperOBSWebsocket {
  id: string;
  value: 'obswebsocket';
  opts: null | {
    allowedIPs: string[],
  },
}

export interface OverlayMapperGroup {
  id: string;
  value: 'group';
  opts: {
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
      type: string;
      opts: any;
    }[],
  }
}

export type OverlayMappers = OverlayMapperCountdown | OverlayMapperGroup | OverlayMapperEventlist | OverlayMapperEmotesCombo | OverlayMapperCredits | OverlayMapperClips | OverlayMapperAlerts | OverlayMapperEmotes | OverlayMapperEmotesExplode | OverlayMapperEmotesFireworks | OverlayMapperPolls | OverlayMapperTTS | OverlayMapperInterface | OverlayMapperOBSWebsocket | OverlayMapperClipsCarousel | OverlayMapperHypeTrain;

export const OverlayMapper = new EntitySchema<Readonly<Required<OverlayMappers>>>({
  name:    'overlay_mapper',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    value: { type: String, nullable: true },
    opts:  { type: 'simple-json', nullable: true },
  },
});