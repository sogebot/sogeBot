import Widget from './_interface';

class Social extends Widget {
  constructor() {
    super({});
    this.addWidget('social', 'widget-title-social', 'fas fa-share-square');
  }
}

module.exports = new Social();
