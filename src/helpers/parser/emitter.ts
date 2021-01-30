import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'process': (
    opts: {
      sender: { username: string; userId: string };
      message: string,
      skip: boolean,
      quiet: boolean
    },
    callback: (responses: CommandResponse[]) => void) => void;
}

class _ParserEmitter extends TypedEmitter<Events> {}
const parserEmitter = new _ParserEmitter();

export { parserEmitter };