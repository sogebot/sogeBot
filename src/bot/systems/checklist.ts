import { settings, ui } from '../decorators';
import { onStreamEnd } from '../decorators/on';
import System from './_interface';

class Checklist extends System {
  @settings('checklist')
  @ui({ type: 'configurable-list' })
  itemsArray: any[] = [];

  @onStreamEnd()
  public onStreamEnd() {
    global.db.engine.remove(this.collection.data, {});
  }
}

export default Checklist;
export { Checklist };
