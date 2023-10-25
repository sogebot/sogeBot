import { persistent } from '../core/persistent.js';

const isStreamOnline = persistent({
  value:     false,
  name:      'isStreamOnline',
  namespace: '/core/api',
});

export { isStreamOnline };