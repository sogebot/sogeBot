import Widget from './_interface';

class JoinPart extends Widget {
  [x: string]: any; // TODO: remove after interface ported to TS

  constructor() {
    super({});
    this.addWidget('join', 'widget-title-join', 'fas fa-sign-in-alt');
    this.addWidget('part', 'widget-title-part', 'fas fa-sign-out-alt');
  }

  public send(event) {
    this.socket.emit('joinpart', { username: event.username, type: event.type });
  }
}

module.exports = new JoinPart();
