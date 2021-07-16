import Widget from './_interface';

class JoinPart extends Widget {
  public send(event: { users: string[], type: 'join' | 'part' }) {
    this.emit('joinpart', { users: event.users, type: event.type });
  }
}

export default new JoinPart();