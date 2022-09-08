import { EntitySchema } from 'typeorm';

export interface OverlayMapperInterfaceCommon {
  id: string; groupId: string | null; name: string | null;
}

export interface OverlayMapperInterface extends OverlayMapperInterfaceCommon {
  value: string | null;
  opts: null
}

export interface OverlayMapperReference extends OverlayMapperInterfaceCommon {
  groupId: string;
  value:  'reference';
  opts:   {
    overlayId: string | null;
  }
}

export interface OverlayMapperChat extends OverlayMapperInterfaceCommon {
  value: 'chat';
  opts: {
    type: 'vertical' | 'horizontal' | 'niconico';
    hideMessageAfter: number;
    showTimestamp: boolean;
    showFromTopOrLeft: boolean;
    reverseOrder: boolean;
    showBadges: boolean;
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
  },
}

export interface OverlayMapperMarathon extends OverlayMapperInterfaceCommon {
  value: 'marathon';
  opts: {
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
  },
}

export interface OverlayMapperStopwatch extends OverlayMapperInterfaceCommon {
  value: 'stopwatch';
  opts: {
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
  },
}

export interface OverlayMapperWordcloud extends OverlayMapperInterfaceCommon {
  value: 'wordcloud';
  opts: {
    fadeOutInterval: number;
    fadeOutIntervalType: 'seconds' | 'minutes' | 'hours';
    wordFont: {
      family: string;
      weight: number;
      color: string;
    }
  },
}

export interface OverlayMapperCountdown extends OverlayMapperInterfaceCommon {
  value: 'countdown';
  opts: {
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
  },
}

export interface OverlayMapperCredits extends OverlayMapperInterfaceCommon {
  value: 'credits';
  opts: {
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
export interface OverlayMapperEventlist extends OverlayMapperInterfaceCommon {
  value: 'eventlist';
  opts: {
    count: number,
    ignore: string[]
    display: string[],
    order: 'asc' | 'desc',
  },
}

export interface OverlayMapperClips extends OverlayMapperInterfaceCommon {
  value: 'clips';
  opts: {
    volume: number,
    filter: 'none' | 'grayscale' | 'sepia' | 'tint' | 'washed',
    showLabel: boolean,
  },
}

export interface OverlayMapperAlerts extends OverlayMapperInterfaceCommon {
  value: 'media';
  opts: {
    galleryCache: boolean,
    galleryCacheLimitInMb: number,
  },
}

export interface OverlayMapperEmotes extends OverlayMapperInterfaceCommon {
  value: 'emotes';
  opts: {
    emotesSize: 1 | 2 | 3,
    maxEmotesPerMessage: number,
    animation: 'fadeup' | 'fadezoom' | 'facebook',
    animationTime: number,
    maxRotation: number,
    offsetX: number,
  },
}

export interface OverlayMapperEmotesCombo extends OverlayMapperInterfaceCommon {
  value: 'emotescombo';
  opts: {
    showEmoteInOverlayThreshold: number,
    hideEmoteInOverlayAfter: number,
  },
}

export interface OverlayMapperEmotesFireworks extends OverlayMapperInterfaceCommon {
  value: 'emotesfireworks';
  opts: {
    emotesSize: 1 | 2 | 3,
    animationTime: number,
    numOfEmotesPerExplosion: number,
    numOfExplosions: number,
  },
}
export interface OverlayMapperEmotesExplode extends OverlayMapperInterfaceCommon {
  value: 'emotesexplode';
  opts: {
    emotesSize: 1 | 2 | 3,
    animationTime: number,
    numOfEmotes: number,
  },
}
export interface OverlayMapperCarousel extends OverlayMapperInterfaceCommon {
  value: 'carousel';
  opts: null,
}

export interface OverlayMapperHypeTrain extends OverlayMapperInterfaceCommon {
  value: 'hypetrain';
  opts: null
}

export interface OverlayMapperClipsCarousel extends OverlayMapperInterfaceCommon {
  value: 'clipscarousel';
  opts: {
    customPeriod: number,
    numOfClips: number,
    volume: number,
    animation: string,
  },
}

export interface OverlayMapperTTS extends OverlayMapperInterfaceCommon {
  value: 'tts';
  opts: {
    voice: string,
    volume: number,
    rate: number,
    pitch: number,
    triggerTTSByHighlightedMessage: boolean,
  },
}

export interface OverlayMapperPolls extends OverlayMapperInterfaceCommon {
  value: 'polls';
  opts: {
    theme: 'light' | 'dark' | 'Soge\'s green',
    hideAfterInactivity: boolean,
    inactivityTime: number,
    align: 'top' | 'bottom',
  },
}

export interface OverlayMapperOBSWebsocket extends OverlayMapperInterfaceCommon {
  value: 'obswebsocket';
  opts: {
    allowedIPs: string[],
  },
}

export interface OverlayMapperAlertsRegistry extends OverlayMapperInterfaceCommon {
  value: 'alertsRegistry' | 'textRegistry';
  opts: {
    id: string,
  },
}

export interface OverlayMapperURL extends OverlayMapperInterfaceCommon {
  value: 'url';
  opts: {
    url: string,
  },
}

export interface OverlayMapperGroup extends OverlayMapperInterfaceCommon {
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
    }[],
  }
}

export type OverlayMappers = OverlayMapperURL | OverlayMapperChat | OverlayMapperReference | OverlayMapperAlertsRegistry | OverlayMapperCarousel | OverlayMapperMarathon | OverlayMapperStopwatch | OverlayMapperCountdown | OverlayMapperGroup | OverlayMapperEventlist | OverlayMapperEmotesCombo | OverlayMapperCredits | OverlayMapperClips | OverlayMapperAlerts | OverlayMapperEmotes | OverlayMapperEmotesExplode | OverlayMapperEmotesFireworks | OverlayMapperPolls | OverlayMapperTTS | OverlayMapperInterface | OverlayMapperOBSWebsocket | OverlayMapperClipsCarousel | OverlayMapperHypeTrain;

export const OverlayMapper = new EntitySchema<Readonly<Required<OverlayMappers>>>({
  name:    'overlay_mapper',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    name:    { type: String, nullable: true },
    groupId: { type: String, nullable: true },
    value:   { type: String, nullable: true },
    opts:    { type: 'simple-json', nullable: true },
  },
  indices: [
    { name: 'IDX_overlay_mapper_groupId', columns: ['groupId'] },
  ],
});