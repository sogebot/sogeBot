// bot libraries
import System from './_interface';
import { settings, ui } from '../decorators';
import { onStreamEnd } from '../decorators/on';

class Checklist extends System {
  @settings({ category: 'checklist' })
  @ui({ type: 'configurable-list' })
  itemsArray: any[] = [];

  @onStreamEnd()
  public onStreamEnd() {
    global.db.engine.remove(this.collection.data, {});
  }
}

export default Checklist;
export { Checklist };
