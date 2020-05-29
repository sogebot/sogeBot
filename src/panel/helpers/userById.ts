import { getSocket } from './socket';

const cache: { [id: string]: string } = {};
const socket = getSocket('/core/users');


export const getUsernameById = async function (id: number) {
  if (typeof cache[id] === 'undefined') {
    const username = await new Promise((resolve: (value: string | null) => void, reject) => {
      socket.emit('getNameById', id, (err: string | null, value: string | null) => {
        if (err) {
          reject(err);
        }
        resolve(value);
      });
    });
    if (username) {
      cache[id] = username;
      return cache[id];
    } else {
      return 'n/a';
    }
  } else {
    return cache[id];
  }
};