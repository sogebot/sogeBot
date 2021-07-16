import { persistent } from '../core/persistent';

const streamId = persistent({
  value:     null as null | string,
  name:      'streamId',
  namespace: '/core/api',
});

export { streamId };