import Module from '../_interface';

class Integration extends Module {
  constructor (opts) {
    opts.settings.enabled = typeof opts.settings.enabled !== 'undefined' ? opts.settings.enabled : false
    super(opts, 'integrations')

    this.addMenu({ category: 'settings', name: 'integrations', id: 'integrations' })
  }
}

export default Integration;
