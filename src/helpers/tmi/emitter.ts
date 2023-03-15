import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
  'say': (channel: string, message: string, opts?: { replyTo: string | undefined }) => void,
  'whisper': (username: string, message: string, opts?: { replyTo: string | undefined }) => void,
  'ban': (username: string) => void,
  'timeout': (username: string, seconds: number, is: { mod: boolean }, reason?: string) => void,
  'delete': (msgId: string) => void,
  'join': (type: 'bot' | 'broadcaster') => void,
  'reconnect': (type: 'bot' | 'broadcaster') => void,
  'part': (type: 'bot' | 'broadcaster') => void,
}

class _TMIEmitter extends TypedEmitter<Events> {}
const tmiEmitter = new _TMIEmitter();

export { tmiEmitter };