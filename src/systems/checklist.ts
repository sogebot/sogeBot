import { getRepository } from 'typeorm';

import { Checklist as ChecklistEntity } from '../database/entity/checklist';
import { settings, ui } from '../decorators';
import { onChange, onStreamEnd } from '../decorators/on';
import { adminEndpoint } from '../helpers/socket';
import System from './_interface';

class Checklist extends System {
  @settings('customization')
  @ui({ type: 'configurable-list' })
  itemsArray: any[] = [];

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const checkedItems = await getRepository(ChecklistEntity).find();
        cb(null, this.itemsArray, checkedItems);
      } catch(e) {
        cb(e.stack, [], []);
      }
    });
    adminEndpoint(this.nsp, 'checklist::save', async (checklistItem, cb) => {
      await getRepository(ChecklistEntity).save(checklistItem);
      if (cb) {
        cb(null);
      }
    });
  }

  @onChange('itemsArray')
  onChangeItemsArray() {
    getRepository(ChecklistEntity).clear();
  }

  @onStreamEnd()
  public onStreamEnd() {
    getRepository(ChecklistEntity).update({}, { isCompleted: false });
  }
}

export default new Checklist();
