import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants';
import { defaultsDeep, pick } from 'lodash';

import { OverlayMappers } from '~/database/entity/overlay';

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
    countdown: {
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
    },
  },
  credits: {
    speed:       'medium',
    social:      [] as { type: string; text: string }[],
    customTexts: [] as { type: string; left: string, right: string, middle: string }[],
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
      gameThumbnail:    true,
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
  },
  eventlist: {
    display: ['username', 'event'],
    ignore:  [],
    count:   5,
    order:   'desc',
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
  obswebsocket: { allowedIPs: [] },
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
    type:             'vertical',
    hideMessageAfter: 600000,
    showTimestamp:    true,
    showBadges:       true,
    font:             {
      family:      'PT Sans',
      size:        20,
      borderPx:    1,
      borderColor: '#000000',
      weight:      '500',
      color:       '#ffffff',
      shadow:      [],
    },
  },
  carousel:   null,
  hypetrain:  null,
  randomizer: null,
  stats:      null,
} as const;

function setDefaultOpts<T extends keyof typeof values>(opts: any, type: T) {
  return pick(
    defaultsDeep(opts, values[type]),
    Object.keys(values[type] || {}),
  );
}

function defaultValues(item: OverlayMappers) {
  const value = item.value as keyof typeof values | null;
  if (value && Object.keys(values).includes(value)) {
    if (values[value]) {
      (item.opts as any) = setDefaultOpts(item.opts, value as any);
    } else {
      item.opts = null;
    }
  } else {
    console.log('Missing default values for overlay ' + value);
  }
  return item;
}

export default defaultValues;
export { setDefaultOpts };