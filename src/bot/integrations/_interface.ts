import Module from '../_interface';

class Integration extends Module {
  constructor() {
    super('integrations', false);
    this.addMenu({ category: 'settings', name: 'integrations', id: 'settings/integrations', this: null });
  }
}

export default Integration;
