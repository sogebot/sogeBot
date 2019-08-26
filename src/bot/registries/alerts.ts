import Registry from './_interface';

class Alerts extends Registry {
  constructor() {
    super();
    this.addMenu({ category: 'registry', name: 'alerts', id: '/registry/alerts/list' });
  }
}

export default Alerts;
export { Alerts };
