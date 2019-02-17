const {
  Worker, isMainThread, parentPort, threadId
} = require('worker_threads');

parentPort.postMessage(`${threadId} loaded`);
parentPort.on('message', (data) => {
  console.log(`WORKER(${threadId}): ${data}`)
})