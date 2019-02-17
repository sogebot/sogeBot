const {
  Worker, isMainThread, parentPort
} = require('worker_threads');
const _ = require('lodash')

const Workers = require('../src/bot/workers')

global.workers = new Workers()

if (isMainThread) {
  for (let i = 0; i < 5; i++){
    workers.newWorker();
  }

  setInterval(() => {
    _.sample(workers.list).postMessage('test')
  }, 1000)

  /*const worker = new Worker(__filename, {
  });
  worker.on('message', (resolve) => console.log('MASTER:' + resolve));
  worker.on('error', (reject) => console.log('error'));
  worker.on('exit', (code) => {
    if (code !== 0)
      new Error(`Worker stopped with exit code ${code}`);
  });
  console.log(parentPort)
  worker.postMessage('test')*/
} else {
  require('./worker.js')
}