import { persistent } from '../core/persistent.js';

const streamType = persistent({
  value:     'live',
  name:      'streamType',
  namespace: '/core/api',
});

export { streamType };