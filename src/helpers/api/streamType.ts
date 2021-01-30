import { persistent } from '../core/persistent';

const streamType = persistent({
  value:     'live',
  name:      'streamType',
  namespace: '/core/api',
});

export { streamType };