// we are using window.socket to reuse socket from index.html
declare global {
  interface Window {
    socket: any;
  }
}

export const getListOf = async function (type: string) {
  // save userId to db
  return new Promise((resolve) => {
    window.socket.emit(type, (err, data) => {
      resolve(data);
    });
  });
}