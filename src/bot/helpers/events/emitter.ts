import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'commercial': (opts: { duration: number }) => void;
  'game-changed': (opts: {oldGame: string, game: string}) => void;
}

class _EventEmitter extends TypedEmitter<Events> {}
const eventEmitter = new _EventEmitter();

export { eventEmitter };