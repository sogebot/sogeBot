import { get, now, sample, set } from 'lodash';
import { join } from 'path';
import { inspect } from 'util';
import { isMainThread, parentPort, threadId, Worker } from 'worker_threads';

import { message, timeout } from './commons';
import { debug } from './debug';

class Workers {
  public onlineCount: number = 0;
  protected path: string = join(__dirname, 'main.js');
  protected list: Worker[] = [];

  public callOnAll(opts) {
    if (isMainThread) {
      // run on master
      const namespace = get(global, opts.ns, null);
      namespace[opts.fnc].apply(namespace, opts.args);
      opts.type = 'call';
      this.sendToAllWorkers(opts);
    } else {
      // need to be sent to master
      this.sendToMaster(opts);
    }
  }

  public sendToAll(opts) {
    if (isMainThread) {
      this.sendToAllWorkers(opts);
    } else {
      this.sendToMaster(opts);
    }

  }

  public send(opts) {
    if (!isMainThread) {
      this.sendToMaster(opts);
    } else {
      this.sendToWorker(opts);
    }
  }

  public sendToMaster(opts) {
    if (isMainThread) {
      throw Error('Cannot send to master from master!');
    } else {
      if (parentPort) {
        parentPort.postMessage(opts);
      } else {
        throw new Error('parentPort is null');
      }
    }
  }

  public sendToAllWorkers(opts) {
    if (!isMainThread) {
      throw Error('Cannot send to worker from worker!');
    } else {
      for (const w of this.list) {
        w.postMessage(opts);
      }
    }
  }

  public sendToWorker(opts) {
    if (!isMainThread) {
      throw Error('Cannot send to worker from worker!');
    } else {
      if (this.list.length === 0) {
        this.process(opts);
      } else {
        const s = sample(this.list);
        if (s) {
          s.postMessage(opts);
        }
      }
    }
  }

  protected newWorker() {
    if (!isMainThread) {
      // although its possible to create thread in thread we don't want to
      return global.log.error('Cannot create new worker in thread');
    }
    if (global.mocha) {
      this.onlineCount = global.cpu;
      return global.log.warning('Testing, not creating any workers');
    }

    const worker = new Worker(this.path);
    this.setListeners(worker);
    worker.on('error', () => {
      debug('workers.status', 'Worker is unexpectedly dead');
      this.onlineCount--;
      this.newWorker();
    });
    worker.on('exit', () => {
      debug('workers.status', 'Worker was exited');
      this.onlineCount--;
      this.newWorker();
    });
    worker.on('online', () => {
      debug('workers.status', 'Worker is online');
      this.onlineCount++;
    });
    this.list.push(worker);
  }

  protected setListeners(worker: Worker) {
    if (isMainThread) {
      if (typeof worker === 'undefined' || worker === null) { throw Error('Cannot create empty listeners in main thread!'); }
      this.setListenersMain(worker);
    } else {
      this.setListenersWorker();
    }
  }

  protected async process(data) {
    if (isMainThread) {
      // we need to be able to always handle db
      if (data.type === 'db') {
        // add data to master controller
        if (typeof global.db === 'undefined') {
          return setTimeout(() => { this.process(data); }, 100);
        }

        if (typeof global.db.engine.data !== 'undefined') {
          global.db.engine.data.push({
            id: data.id,
            items: data.items,
            timestamp: now(),
          });
        }
        return;
      }

      if (!global.db.engine.connected || !(global.lib && global.lib.translate)) { return setTimeout(() => this.process(data), 1000); }
      debug('workers.messages', 'MAIN: ' + JSON.stringify(data));

      if (data.type === 'lang') {
        this.sendToAllWorkers({ type: 'lang' });
        await global.lib.translate._load();
      } else if (data.type === 'call') {
        const namespace = get(global, data.ns, null);
        namespace[data.fnc].apply(namespace, data.args);
      } else if (data.type === 'log') {
        return global.log[data.level](data.message, data.params);
      } else if (data.type === 'say') {
        message('say', null, data.message);
      } else if (data.type === 'me') {
        message('me', null, data.message);
      } else if (data.type === 'whisper') {
        message('whisper', data.sender, data.message);
      } else if (data.type === 'timeout') {
        timeout(data.username, data.reason, data.timeout);
      } else if (data.type === 'api') {
        global.api[data.fnc](data.username, data.id);
      } else if (data.type === 'event') {
        global.events.fire(data.eventId, data.attributes);
      } else if ( data.type === 'interface') {
        // remove core from path
        if (data.system === 'core') {
          const obj = Object.values(global).find((o) => {
            return o.constructor.name.toLowerCase() === data.class.toLowerCase();
          });
          if (obj) { set(obj, data.path, data.value); }
        } else {
          try {
            const obj = Object.values(global[data.system]).find((o: any) => {
              return o.constructor.name.toLowerCase() === data.class.toLowerCase();
            }) as any;
            if (obj) { set(obj, data.path, data.value); }
          } catch (e) {
            if ((data.retry || 0) < 5) {
              setTimeout(() => {
                data.retry = (data.retry || 0) + 1;
                this.process(data);
              }, 5000);
            } else {
              global.log.error(e.stack);
              global.log.error('Something went wrong when emiting');
              global.log.error(inspect(data, undefined, 5));
            }
          }
        }
      } else if ( data.type === 'emit') {
        // remove core from path
        if (data.system === 'core') {
          const obj = Object.values(global).find((o) => {
            return o.constructor.name.toLowerCase() === data.class.toLowerCase();
          });
          if (obj && obj.socket) { obj.emit(data.event, ...data.args); }
        } else {
          try {
            const obj = Object.values(global[data.system]).find((o: any) => {
              return o.constructor.name.toLowerCase() === data.class.toLowerCase();
            }) as any;
            if (obj) {
              obj.emit(data.event, ...data.args);
            }
          } catch (e) {
            if ((data.retry || 0) < 5) {
              setTimeout(() => {
                data.retry = (data.retry || 0) + 1;
                this.process(data);
              }, 5000);
            } else {
              global.log.error(e.stack);
              global.log.error('Something went wrong when emiting');
              global.log.error(inspect(data, undefined, 5));
            }
          }
        }
      } else if ( data.type === 'interfaceFnc') {
        // remove core from path
        if (data.system === 'core') {
          const obj = Object.values(global).find((o) => {
            return o.constructor.name.toLowerCase() === data.class.toLowerCase();
          });
          if (obj) {
            obj[data.fnc](...data.args);
          }
        } else {
          try {
            const obj = Object.values(global[data.system]).find((o: any) => {
              return o.constructor.name.toLowerCase() === data.class.toLowerCase();
            }) as any;
            if (obj) {
              obj[data.fnc](...data.args);
            }
          } catch (e) {
            if ((data.retry || 0) < 5) {
              setTimeout(() => {
                data.retry = (data.retry || 0) + 1;
                this.process(data);
              }, 5000);
            } else {
              global.log.error(e.stack);
              global.log.error('Something went wrong when running interfaceFnc');
              global.log.error(inspect(data, undefined, 5));
            }
          }
        }
      } else if ( data.type === 'crash') {
        process.exit(1); // kill main thread
      }
    } else {
      debug('workers.messages', 'THREAD(' + threadId + '): ' + JSON.stringify(data));
      switch (data.type) {
        case 'interface':
          // remove core from path
          if (data.system === 'core') {
            const obj = Object.values(global).find((o) => {
              return o.constructor.name.toLowerCase() === data.class.toLowerCase();
            });
            if (obj) {
              set(obj, data.path, data.value);
            } else {
              throw Error(`${data.class} not found`);
            }
          } else if (data.system === 'widgets') {
            // widgets are only on master
            break;
          } else {
            try {
              const obj = Object.values(global[data.system]).find((o: any) => {
                return o.constructor.name.toLowerCase() === data.class.toLowerCase();
              }) as any;
              if (obj) {
                set(obj, data.path, data.value);
              } else {
                throw Error(`${data.class} not found`);
              }
            } catch (e) {
              global.log.error(e.stack);
              global.log.error('Something went wrong when updating interface variable');
              global.log.error(inspect(data, undefined, 5));
            }
          }
          break;
        case 'interfaceFnc':
          // remove core from path
          if (data.system === 'core') {
            const obj = Object.values(global).find((o) => {
              return o.constructor.name.toLowerCase() === data.class.toLowerCase();
            });
            if (obj) {
              obj[data.fnc](...data.args);
            }
          } else {
            try {
              const obj = Object.values(global[data.system]).find((o: any) => {
                return o.constructor.name.toLowerCase() === data.class.toLowerCase();
              }) as any;
              if (obj) {
                obj[data.fnc](...data.args);
              }
            } catch (e) {
              if ((data.retry || 0) < 5) {
                setTimeout(() => {
                  data.retry = (data.retry || 0) + 1;
                  this.process(data);
                }, 5000);
              } else {
                global.log.error(e.stack);
                global.log.error('Something went wrong when running interfaceFnc');
                global.log.error(inspect(data, undefined, 5));
              }
            }
          }
          break;
        case 'call':
          const namespace = get(global, data.ns, null);
          namespace[data.fnc].apply(namespace, data.args);
          break;
        case 'lang':
          global.lib.translate._load();
          break;
        case 'shutdown':
          process.exit(0);
          break;
        case 'db':
          switch (data.fnc) {
            case 'find':
              data.items = await global.db.engine.find(data.table, data.where, data.lookup);
              break;
            case 'findOne':
              data.items = await global.db.engine.findOne(data.table, data.where, data.lookup);
              break;
            case 'increment':
              data.items = await global.db.engine.increment(data.table, data.where, data.object);
              break;
            case 'incrementOne':
              data.items = await global.db.engine.incrementOne(data.table, data.where, data.object);
              break;
            case 'insert':
              data.items = await global.db.engine.insert(data.table, data.object);
              break;
            case 'remove':
              data.items = await global.db.engine.remove(data.table, data.where);
              break;
            case 'update':
              data.items = await global.db.engine.update(data.table, data.where, data.object);
              break;
            case 'index':
              data.items = await global.db.engine.index(...data.opts);
              break;
            case 'count':
              data.items = await global.db.engine.count(data.table, data.where, data.object);
              break;
            default:
              global.log.error('This db call is not correct');
              global.log.error(data);
          }

          global.workers.sendToMaster(data);
      }
    }
  }

  protected setListenersMain(worker) {
    debug('workers.messages', 'MAIN: loading listeners');
    worker.on('message', (msg) => { this.process(msg); });
  }

  protected setListenersWorker() {
    debug('workers.messages', 'THREAD(' + threadId + '): loading listeners');
    if (parentPort) {
      parentPort.on('message', (msg) => { this.process(msg); });
    } else {
      throw new Error('parentPort is null');
    }
  }
}

export default Workers;
export { Workers };
