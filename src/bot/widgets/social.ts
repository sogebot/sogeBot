import Widget from './_interface';

class Social extends Widget {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    super({});
    this.addWidget('social', 'widget-title-social', 'fas fa-share-square');
  }
}

module.exports = new Social();
