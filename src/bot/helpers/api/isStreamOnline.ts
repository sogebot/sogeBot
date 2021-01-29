import { persistent } from '../core/persistent';

const isStreamOnline = persistent({
  value:     false,
  name:      'isStreamOnline',
  namespace: '/core/api',
});

export { isStreamOnline };