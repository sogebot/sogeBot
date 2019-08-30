import Registry from './_interface';
import { isMainThread } from 'worker_threads';
import { generateUsername } from '../helpers/generateUsername';
import { getLocalizedName } from '../commons';

class Alerts extends Registry {
  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'alerts', id: '/registry/alerts/list' });
  }

  sockets () {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }

    this.socket.on('connection', (socket) => {
      socket.on('test', async (event: keyof Registry.Alerts.List) => {
        this.test({ event, isResub: Math.random() < 0.5 });
      });
    });
  }

  test(opts: { event: keyof Registry.Alerts.List; isResub: boolean }) {
    if (!isMainThread) {
      global.workers.sendToMaster({ type: 'call', ns: 'registries.alerts', fnc: 'test', args: [opts] });
      return;
    }

    const amount = Math.floor(Math.random() * 1000);
    const data: Registry.Alerts.EmitData = {
      username: generateUsername(),
      amount,
      currency: global.currency.mainCurrency,
      monthsName: getLocalizedName(amount, 'core.months'),
      event: opts.event,
      isResub: opts.isResub,
      message: Math.random() < 0.5
        ? 'This is test message'
        : '',
    };

    global.panel.io.of('/registries/alerts').emit('alert', { data });
  }
}

export default Alerts;
export { Alerts };
