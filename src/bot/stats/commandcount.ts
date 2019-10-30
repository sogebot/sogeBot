import Stats from './_interface';

class CommandCount extends Stats {
  constructor() {
    super();
    this.addMenu({ category: 'stats', name: 'commandcount', id: 'stats/commandcount' });
  }
}

export default CommandCount;
export { CommandCount };
