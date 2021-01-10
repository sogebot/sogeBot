import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'updateChannelViewsAndBroadcasterType': () => void;
}

class _APIEmitter extends TypedEmitter<Events> {}
const apiEmitter = new _APIEmitter();

export { apiEmitter };