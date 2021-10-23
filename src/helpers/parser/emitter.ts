import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'process': (
    opts: {
      sender: { userName: string; userId: string };
      message: string,
      skip: boolean,
      quiet: boolean
    },
    callback: (responses: CommandResponse[]) => void) => void;
  'fireAndForget': (
    opts: {
      this: any,
      fnc: any,
      opts: ParserOptions,
    }) => void;
}

class _ParserEmitter extends TypedEmitter<Events> {}
const parserEmitter = new _ParserEmitter();

export { parserEmitter };