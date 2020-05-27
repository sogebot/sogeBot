import Widget from './_interface';

class JoinPart extends Widget {
  constructor() {
    super();
    this.addWidget('join', 'widget-title-join', 'fas fa-sign-in-alt');
    this.addWidget('part', 'widget-title-part', 'fas fa-sign-out-alt');
  }

  public send(event: { users: string[], type: 'join' | 'part' }) {
    this.emit('joinpart', { users: event.users, type: event.type });
  }
}

export default new JoinPart();