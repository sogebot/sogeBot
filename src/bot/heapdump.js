/**
 * Simple userland heapdump generator using v8-profiler
 * Usage: require('[path_to]/HeapDump').init('datadir')
 *
 * @module HeapDump
 * @type {exports}
 */

const chalk = require('chalk')
var fs = require('fs')
var profiler = require('v8-profiler-node8')
var _datadir = null
var nextMBThreshold = 200
var memMBlast = 0
var heapTaken = 0

/**
 * Init and scheule heap dump runs
 *
 * @param datadir Folder to save the data to
 */
module.exports.init = function (datadir) {
  _datadir = datadir
  setInterval(tickHeapDump, 1000)
}

/**
 * Schedule a heapdump by the end of next tick
 */
function tickHeapDump () {
  setImmediate(function () {
    heapDump()
  })
}

/**
 * Creates a heap dump if the currently memory threshold is exceeded
 */
function heapDump () {
  if (heapTaken > 0) {
    return --heapTaken
  }
  var memMB = process.memoryUsage().heapUsed / 1048576
  console.log(chalk.bgRed((require('cluster').isMaster ? 'Master' : 'Cluster') +
    ' # Current mem usage: ' + memMB +
    ', last mem usage: ' + memMBlast +
    ', change: ' + (memMB - memMBlast) +
    ', threshold: ' + nextMBThreshold))
  memMBlast = memMB
  if (memMB > nextMBThreshold) {
    heapTaken = 2 * 60 // wait more before next heap (making heap may cause enxt heap to be too high)
    nextMBThreshold = memMB + 25
    console.log('Taking snapshot - ' + (require('cluster').isMaster ? 'Master' : 'Cluster'))
    var snap = profiler.takeSnapshot('profile')
    saveHeapSnapshot(snap, _datadir)
  }
}

/**
 * Saves a given snapshot
 *
 * @param snapshot Snapshot object
 * @param datadir Location to save to
 */
function saveHeapSnapshot (snapshot, datadir) {
  snapshot.export(function (error, result) {
    if (error) return console.log(error)
    let name = datadir + 'snapshot-' + Date.now() + '.heapsnapshot'
    fs.writeFileSync(name, result)
    console.log('Heap snapshot written to ' + name)
    snapshot.delete()
  })
}
