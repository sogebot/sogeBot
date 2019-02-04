import Module from '../_interface';

class System extends Module {
  constructor(opts) {
    opts.name = 'systems';
    super(opts);
  }
}

export default System;
