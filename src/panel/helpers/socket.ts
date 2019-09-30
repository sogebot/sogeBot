import io from 'socket.io-client';
declare let token: string;

const sockets: {[namespace: string]: SocketIOClient.Socket} = {};

export function getSocket(namespace: string) {
  if (typeof sockets[namespace] === 'undefined') {
    sockets[namespace] = io(namespace, { query: 'token=' + token, forceNew: true });
  }
  return sockets[namespace];
}