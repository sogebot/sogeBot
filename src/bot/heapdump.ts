/**
 * Simple userland heapdump generator
 * Usage: require('[path_to]/HeapDump').init('datadir')
 *
 * @module HeapDump
 * @type {exports}
 */

import chalk from 'chalk';
import fs from 'fs';
import { writeHeapSnapshot } from 'v8';
import { isMainThread } from 'worker_threads';

let _datadir = null;
let nextMBThreshold = 100;
let memMBlast = 0;
let heapTaken = 0;
let csvfilePath = '';

/**
 * Init and scheule heap dump runs
 *
 * @param datadir Folder to save the data to
 */
module.exports.init = (datadir) => {
  _datadir = datadir;
  csvfilePath = datadir + '/heap-' + (isMainThread ? 'master' : 'cluster') + '.csv';
  fs.writeFileSync(csvfilePath, 'memory, timestamp\n');
  setInterval(tickHeapDump, 1000);
};

/**
 * Schedule a heapdump by the end of next tick
 */
function tickHeapDump() {
  setImmediate(() => {
    heapDump();
  });
}

/**
 * Creates a heap dump if the currently memory threshold is exceeded
 */
function heapDump() {
  if (heapTaken > 0) {
    return --heapTaken;
  }
  const memMB = process.memoryUsage().heapUsed / 1048576;

  fs.appendFileSync(csvfilePath, `${memMB}, ${Date.now()}\n`);

  global.log.info(chalk.bgRed((isMainThread ? 'Master' : 'Cluster') +
    ' # Current mem usage: ' + memMB +
    ', last mem usage: ' + memMBlast +
    ', change: ' + (memMB - memMBlast) +
    ', threshold: ' + nextMBThreshold));
  memMBlast = memMB;
  if (memMB > nextMBThreshold) {
    heapTaken = 2 * 60; // wait more before next heap (making heap may cause enxt heap to be too high)
    nextMBThreshold = memMB + 25;
    global.log.info('Taking snapshot - ' + (isMainThread ? 'Master' : 'Cluster'));
    saveHeapSnapshot(_datadir);
  }
}

/**
 * Saves a given snapshot
 *
 * @param datadir Location to save to
 */
function saveHeapSnapshot(datadir) {
  const name = datadir + (isMainThread ? 'master' : 'cluster') + '-' + Date.now() + '.heapsnapshot';
  writeHeapSnapshot(name);
  global.log.info('Heap snapshot written to ' + name);
}
