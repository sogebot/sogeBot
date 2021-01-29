import { persistent } from '../core/persistent';

const stats = persistent({
  value: {
    language:           'en',
    currentWatchedTime: 0,
    currentViewers:     0,
    maxViewers:         0,
    currentSubscribers: 0,
    currentBits:        0,
    currentTips:        0,
    currentFollowers:   0,
    currentViews:       0,
    currentGame:        null,
    currentTitle:       null,
    currentHosts:       0,
    newChatters:        0,
  } as {
    language: string;
    currentWatchedTime: number;
    currentViewers: number;
    maxViewers: number;
    currentSubscribers: number;
    currentBits: number;
    currentTips: number;
    currentFollowers: number;
    currentViews: number;
    currentGame: string | null;
    currentTitle: string | null;
    currentHosts: number;
    newChatters: number;
  },
  name:      'stats',
  namespace: '/core/api',
});

export { stats };