import { settings, ui } from '../decorators';
import { onChange, onStreamEnd } from '../decorators/on';
import System from './_interface';

import { getRepository } from 'typeorm';
import { Checklist as ChecklistEntity } from '../database/entity/checklist';
import { adminEndpoint } from '../helpers/socket';

class Checklist extends System {
  @settings('checklist')
  @ui({ type: 'configurable-list' })
  itemsArray: any[] = [];

  sockets() {
    adminEndpoint(this.nsp, 'checklist::getAll', async (cb) => {
      try {
        const checkedItems = await getRepository(ChecklistEntity).find();
        cb(null, this.itemsArray, checkedItems);
      } catch(e) {
        cb(e, [], []);
      }
    });
    adminEndpoint(this.nsp, 'checklist::save', async (checklistItem, cb) => {
      await getRepository(ChecklistEntity).save(checklistItem);
      cb();
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
