import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants.js';
import { defaultsDeep } from 'lodash-es';

import { Overlay } from '~/database/entity/overlay.js';

const values = {
  url:            { url: '' },
  alertsRegistry: { id: '' },
  textRegistry:   { id: '' },
  countdown:      {
    time:                       60000,
    currentTime:                60000,
    messageWhenReachedZero:     '',
    isPersistent:               false,
    isStartedOnSourceLoad:      true,
    showMessageWhenReachedZero: false,
    showMilliseconds:           false,
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
  },
  marathon: {
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
  },
  stopwatch: {
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
  },
  alerts: {
    alertDelayInMs: 0,
    parry:          {
      enabled: false,
      delay:   0,
    },
    profanityFilter: {
      type: 'replace-with-asterisk',
      list: {
        cs: false,
        en: true,
        ru: false,
      },
      customWords: '',
    },
    globalFont1: {
      align:          'center',
      family:         'PT Sans',
      size:           24,
      borderPx:       1,
      borderColor:    '#000000',
      weight:         800,
      color:          '#ffffff',
      highlightcolor: '#00ff00',
      shadow:         [],
    },
    globalFont2: {
      align:          'left',
      family:         'PT Sans',
      size:           16,
      borderPx:       1,
      borderColor:    '#000000',
      highlightcolor: '#00ff00',
      weight:         500,
      color:          '#ffffff',
      shadow:         [],
    },
    tts: {
      voice:  'UK English Female',
      volume: 50,
      rate:   1,
      pitch:  1,
    },
    items: [],
  },
  credits: {
    speed:              'medium',
    waitBetweenScreens: 0,
    screens:            [],
  },
  eventlist: {
    display:                      ['username', 'event'],
    ignore:                       [],
    count:                        5,
    order:                        'desc',
    fadeOut:                      false,
    inline:                       false,
    spaceBetweenItems:            5,
    spaceBetweenEventAndUsername: 5,
    usernameFont:                 {
      family:      'PT Sans',
      align:       'right',
      size:        30,
      borderPx:    1,
      borderColor: '#000000',
      weight:      '500',
      color:       '#ffffff',
      shadow:      [],
    },
    eventFont: {
      align:       'left',
      family:      'PT Sans',
      size:        40,
      borderPx:    1,
      borderColor: '#000000',
      weight:      '900',
      color:       '#ffffff',
      shadow:      [],
    },
  },
  html: {
    html:       '<!-- you can also use html here, global filters and custom variables are also available -->\n\n',
    css:        '// use #wrapper to target this specific overlay widget\n\n#wrapper {\n\n}',
    javascript: 'function onLoad() { // triggered on page load\n\n}\n\nfunction onChange() { // triggered on variable change\n\n}',
  },
  clips: {
    volume:    0,
    filter:    'none',
    showLabel: true,
  },
  media: {
    galleryCache:          false,
    galleryCacheLimitInMb: 50,
  },
  emotes: {
    emotesSize:          3,
    animation:           'fadeup',
    animationTime:       1000,
    maxEmotesPerMessage: 5,
    maxRotation:         2250,
    offsetX:             200,
  },
  emotescombo: {
    showEmoteInOverlayThreshold: 3,
    hideEmoteInOverlayAfter:     30,
  },
  emotesfireworks: {
    emotesSize:              3,
    numOfEmotesPerExplosion: 10,
    animationTime:           1000,
    numOfExplosions:         5,
  },
  emotesexplode: {
    emotesSize:    3,
    animationTime: 1000,
    numOfEmotes:   5,
  },
  clipscarousel: {
    volume:       0,
    customPeriod: 31,
    numOfClips:   20,
    animation:    'slide',
    spaceBetween: 200,
  },
  tts: {
    voice:                          'UK English Female',
    volume:                         50,
    rate:                           1,
    pitch:                          1,
    triggerTTSByHighlightedMessage: false,
  },
  polls: {
    theme:               'light',
    hideAfterInactivity: false,
    inactivityTime:      5000,
    align:               'top',
  },
  obswebsocket: { allowedIPs: [], password: '', port: '4455' },
  group:        {
    canvas: {
      height: 1080,
      width:  1920,
    },
    items: [],
  },
  wordcloud: {
    fadeOutInterval:     10,
    fadeOutIntervalType: 'minutes',
    wordFont:            {
      family: 'PT Sans',
      weight: '500',
      color:  '#ffffff',
    },
  },
  reference: {
    overlayId: null,
  },
  chat: {
    type:                          'vertical',
    hideMessageAfter:              600000,
    showTimestamp:                 true,
    showBadges:                    true,
    showCommandMessages:           false,
    useCustomLineHeight:           false,
    customLineHeight:              14,
    useCustomBadgeSize:            false,
    customBadgeSize:               14,
    useCustomEmoteSize:            false,
    customEmoteSize:               14,
    useCustomSpaceBetweenMessages: false,
    useGeneratedColors:            true,
    useCustomUsernameColor:        false,
    customSpaceBetweenMessages:    4,
    messagePadding:                0,
    reverseOrder:                  false,
    font:                          {
      family:      'PT Sans',
      size:        20,
      borderPx:    1,
      borderColor: '#000000',
      weight:      '500',
      color:       '#ffffff',
      shadow:      [],
    },
    separatorFont:          null,
    usernameFont:           null,
    separator:              ': ',
    messageBackgroundColor: '#ffffff00',
  },
  carousel: {
    images: [],
  },
  plugin: {
    pluginId:  '',
    overlayId: '',
  },
  goal: {
    display: {
      type:                  'fade',
      durationMs:            30000,
      animationInMs:         1000,
      animationOutMs:        1000,
      spaceBetweenGoalsInPx: 1,
    },
    campaigns: [],
  },
  hypetrain:  null,
  randomizer: null,
  stats:      null,
} as const;

function setDefaultOpts<T extends keyof typeof values>(opts: any, type: T): Overlay['items'][number]['opts'] {
  return {
    ...defaultsDeep(opts, values[type]),
    typeId: type,
  };
}

function defaultValues(overlay: Overlay) {
  for (const item of overlay.items) {
    if (Object.keys(values).includes(item.opts.typeId)) {
      item.opts = {
        ...setDefaultOpts(item.opts, item.opts.typeId),
        typeId: item.opts.typeId,
      } as any;
    }
  }

  return overlay;
}

export default defaultValues;
export { setDefaultOpts };