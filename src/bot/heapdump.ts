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
import { isMainThread } from './cluster';
import { info } from './helpers/log';
import api from './api';

let _datadir: string;
let memMBlast = 0;
let heapCountdown = 12;
let csvfilePath = '';
let heapUsed: number[] = [];
let heapTotal: number[] = [];

/**
 * Init and scheule heap dump runs
 *
 * @param datadir Folder to save the data to
 */
module.exports.init = (datadir: string) => {
  _datadir = datadir;
  csvfilePath = datadir + '/heap'  + Date.now() + '.csv';
  fs.writeFileSync(csvfilePath, 'timestamp\tavgHeapTotal\tavgHeapUsed\tchange\n');
  setInterval(tickMemory, 1000);
  setInterval(tickHeapDump, 5 * 60000);
};

/**
 * Schedule a heapdump by the end of next tick
 */
function tickHeapDump() {
  setImmediate(() => {
    heapDump();
  });
}

function tickMemory() {
  heapUsed.push(process.memoryUsage().heapUsed / 1048576);
  heapTotal.push(process.memoryUsage().heapTotal / 1048576);
}


const arrAvg = (arr: number[]) => arr.reduce((a,b) => a + b, 0) / arr.length;

/**
 * Creates a heap dump if the currently memory threshold is exceeded
 */
function heapDump() {
  const avgHeapUsed = arrAvg(heapUsed);
  const avgHeapTotal = String(arrAvg(heapTotal)).replace('.', ',');
  heapUsed = [];
  heapTotal = [];

  const memory = String(avgHeapUsed).replace('.', ',');
  const change = avgHeapUsed - memMBlast;

  fs.appendFileSync(csvfilePath, `${String(new Date())}\t${avgHeapTotal}\t${memory}\t${String(change).replace('.', ',')}\n`);

  info(chalk.bgRed((api.isStreamOnline ? 'Online' : 'Offline')
    + ' # Current avg mem usage: ' + avgHeapUsed
    + ', last avg mem usage: ' + memMBlast
    + ', change: ' + change));
  memMBlast = avgHeapUsed;

  heapCountdown--;
  if (change > 20 || heapCountdown === 0) {
    heapCountdown = 12;
    info('Taking snapshot - ' + (api.isStreamOnline ? 'Online' : 'Offline'));
    saveHeapSnapshot(_datadir);
  }
}

/**
 * Saves a given snapshot
 *
 * @param datadir Location to save to
 */
function saveHeapSnapshot(datadir: string) {
  const name = datadir + (isMainThread ? 'master' : 'cluster') + '-' + Date.now() + '.heapsnapshot';
  writeHeapSnapshot(name);
  info('Heap snapshot written to ' + name);
}
