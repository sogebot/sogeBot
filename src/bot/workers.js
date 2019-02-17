const path = require('path');
const _ = require('lodash');
const {
  Worker, isMainThread, parentPort,
} = require('worker_threads');

class Workers {
  constructor() {
    this.path = path.join(__dirname, 'main.js')
    this.list = []
    this.onlineCount = 0
  }

  newWorker() {
    if (!isMainThread) {
      // although its possible to create thread in thread we don't want to
      global.log.error('Cannot create new worker in thread');
    }
    const worker = new Worker(this.path)
    this.setListeners(worker)
    worker.on('exit', () => {
      this.onlineCount--;
      this.newWorker();
    });
    worker.on('online', () => {
      this.onlineCount++;
    });
    this.list.push(worker);
  }

  sendToWorker(opts) {
    if (!isMainThread) {
      throw Error('Cannot send to worker from worker!');
    } else {
      _.sample(this.list).postMessage(opts);
    }
  }

  setListeners(worker) {
    if (!global.db.engine.connected || !(global.lib && global.lib.translate)) return setTimeout(() => this.setListeners(worker), 100)

    if (isMainThread) {
      if (typeof worker === undefined || worker === null) throw Error('Cannot create empty listeners in main thread!')
      this.setListenersMain(worker)
    } else {
      this.setListenersWorker()
    }
  }

  setListenersMain(worker) {
    worker.on('message', async (msg) => {
      if (msg.type === 'lang') {
        for (let worker in cluster.workers) cluster.workers[worker].send({ type: 'lang' })
        await global.lib.translate._load()
      } else if (msg.type === 'call') {
        const namespace = _.get(global, msg.ns, null)
        namespace[msg.fnc].apply(namespace, msg.args)
      } else if (msg.type === 'log') {
        return global.log[msg.level](msg.message, msg.params)
      } else if (msg.type === 'stats') {
        let avgTime = 0
        global.avgResponse.push(msg.value)
        if (msg.value > 1000) global.log.warning(`Took ${msg.value}ms to process: ${msg.message}`)
        if (global.avgResponse.length > 100) global.avgResponse.shift()
        for (let time of global.avgResponse) avgTime += parseInt(time, 10)
        global.status['RES'] = (avgTime / global.avgResponse.length).toFixed(0)
      } else if (msg.type === 'say') {
        global.commons.message('say', null, msg.message)
      } else if (msg.type === 'me') {
        global.commons.message('me', null, msg.message)
      } else if (msg.type === 'whisper') {
        global.commons.message('whisper', msg.sender, msg.message)
      } else if (msg.type === 'parse') {
        _.sample(cluster.workers).send({ type: 'message', sender: msg.sender, message: msg.message, skip: true, quiet: msg.quiet }) // resend to random worker
      } else if (msg.type === 'db') {
          // add data to master controller
          if (typeof global.db.engine.data !== 'undefined') {
            global.db.engine.data.push({
              id: msg.id,
              items: msg.items,
              timestamp: _.now()
            })
          }
      } else if (msg.type === 'timeout') {
        global.commons.timeout(msg.username, msg.reason, msg.timeout)
      } else if (msg.type === 'api') {
        global.api[msg.fnc](msg.username, msg.id)
      } else if (msg.type === 'event') {
        global.events.fire(msg.eventId, msg.attributes)
      } else if ( msg.type === 'interface') {
        _.set(global, msg.path, msg.value);
      }
    });
  }

  setListenersWorker() {
    parentPort.on('message', async (data) => {
      switch (data.type) {
        case 'interface':
          _.set(global, data.path, data.value);
          break;
        case 'call':
          const namespace = _.get(global, data.ns, null)
          namespace[data.fnc].apply(namespace, data.args)
          break
        case 'lang':
          global.lib.translate._load()
          break
        case 'shutdown':
          gracefullyExit()
          break
        case 'message':
          global.tmi.message(data)
          break
        case 'db':
          workerIsFree.db = false
          switch (data.fnc) {
            case 'find':
              data.items = await global.db.engine.find(data.table, data.where, data.lookup)
              break
            case 'findOne':
              data.items = await global.db.engine.findOne(data.table, data.where, data.lookup)
              break
            case 'increment':
              data.items = await global.db.engine.increment(data.table, data.where, data.object)
              break
            case 'incrementOne':
              data.items = await global.db.engine.incrementOne(data.table, data.where, data.object)
              break
            case 'insert':
              data.items = await global.db.engine.insert(data.table, data.object)
              break
            case 'remove':
              data.items = await global.db.engine.remove(data.table, data.where)
              break
            case 'update':
              data.items = await global.db.engine.update(data.table, data.where, data.object)
              break
            case 'index':
              data.items = await global.db.engine.index(data.opts)
              break
            case 'count':
              data.items = await global.db.engine.count(data.table, data.where, data.object)
              break
            default:
              global.log.error('This db call is not correct')
              global.log.error(data)
          }
          if (parentPort && parentPort.postMessage) parentPort.postMessage(data)
          workerIsFree.db = true
      }
    })
  }
}

module.exports = Workers