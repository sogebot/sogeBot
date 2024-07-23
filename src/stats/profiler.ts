import Stats from './_interface.js';

import { Get } from '~/decorators/endpoint.js';
import { avgTime } from '~/helpers/profiler.js';

class Profiler extends Stats {
  constructor() {
    super();
    this.addMenu({
      category: 'stats', name: 'profiler', id: 'stats/profiler', this: null, scopeParent: this.scope(),
    });
  }

  @Get('/')
  public async read() {
    return Array.from(avgTime.entries());
  }
}

export default new Profiler();
