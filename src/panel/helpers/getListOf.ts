import { getSocket } from 'src/panel/helpers/socket';

export const getListOf = async function (type: string) {
  // save userId to db
  return new Promise((resolve) => {
    getSocket('/').emit(type, (err, data) => {
      if (err) {
        console.error(err);
      }
      resolve(data);
    });
  });
};
