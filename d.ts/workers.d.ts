declare namespace Workers {
  type worker = {
    postMessage: (opts: {}) => any,
  };

  type main = {
    list: Workers.worker[],

    sendToWorker: (opts: {}) => any,
  }
}