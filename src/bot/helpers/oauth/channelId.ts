import { persistent } from '../core/persistent';

const channelId = persistent({
  value:     '',
  name:      'channelId',
  namespace: '/core/oauth',
});

export { channelId };