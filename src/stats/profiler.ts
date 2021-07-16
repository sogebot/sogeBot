import { avgTime } from '../helpers/profiler';
import { adminEndpoint } from '../helpers/socket';
import Stats from './_interface';

class Profiler extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'profiler', id: 'stats/profiler', this: null,
    });
  }
  public sockets() {
    adminEndpoint(this.nsp, 'profiler::load', async (cb) => {
      cb(null, Array.from(avgTime.entries()));
    });
  }
}

export default new Profiler();
