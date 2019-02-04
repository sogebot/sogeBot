import Module from '../_interface';

class System extends Module {
  constructor(opts) {
    opts.name = 'widgets';
    super(opts);
  }
}

export default System;
