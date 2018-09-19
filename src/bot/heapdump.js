/**
 * Simple userland heapdump generator using v8-profiler
 * Usage: require('[path_to]/HeapDump').init('datadir')
 *
 * @module HeapDump
 * @type {exports}
 */

var fs = require('fs')
var profiler = require('v8-profiler-node8')
var _datadir = null
var nextMBThreshold = 400

/**
 * Init and scheule heap dump runs
 *
 * @param datadir Folder to save the data to
 */
module.exports.init = function (datadir) {
  _datadir = datadir
  setInterval(tickHeapDump, 5000)
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
  var memMB = process.memoryUsage().rss / 1048576

  if (memMB > nextMBThreshold) {
    nextMBThreshold += 50
    console.log('Taking snapshot - threshold ' + nextMBThreshold)
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
