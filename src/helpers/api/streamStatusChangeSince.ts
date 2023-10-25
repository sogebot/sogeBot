import { persistent } from '../core/persistent.js';

const streamStatusChangeSince = persistent({
  value:     Date.now(),
  name:      'streamStatusChangeSince',
  namespace: '/core/api',
});

export { streamStatusChangeSince };