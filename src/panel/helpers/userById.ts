declare let token: string;

const cache: { [id: string]: string } = {};
const socket = io('/core/users', { query: 'token=' + token });


export const getUsernameById = async function (id: string) {
  if (typeof cache[id] === 'undefined') {
    const username = await new Promise((resolve: (value: string | null) => void) => {
      socket.emit('getNameById', id, (username: string | null) => {
        resolve(username);
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