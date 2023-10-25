import { persistent } from '../core/persistent.js';

const gameCache = persistent({
  value:     '',
  name:      'gameCache',
  namespace: '/core/api',
});

const rawStatus = persistent({
  value:     '',
  name:      'rawStatus',
  namespace: '/core/api',
});

const tagsCache = persistent({
  value:     '[]',
  name:      'tagsCache',
  namespace: '/core/api',
});

export { rawStatus, gameCache, tagsCache };