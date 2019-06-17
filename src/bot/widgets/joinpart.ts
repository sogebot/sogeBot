import Widget from './_interface';

class JoinPart extends Widget {
  constructor() {
    super();
    this.addWidget('join', 'widget-title-join', 'fas fa-sign-in-alt');
    this.addWidget('part', 'widget-title-part', 'fas fa-sign-out-alt');
  }

  public send(event) {
    this.emit('joinpart', { username: event.username, type: event.type });
  }
}

export default JoinPart;
export { JoinPart };