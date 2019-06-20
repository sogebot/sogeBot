import Stats from './_interface';
import { indexCommandUsageDb } from '../helpers/commands/count';

class CommandCount extends Stats {
  constructor() {
    super();
    this.addMenu({ category: 'stats', name: 'commandcount', id: 'stats/commandcount' });
    indexCommandUsageDb();
  }
}

export default CommandCount;
export { CommandCount };
