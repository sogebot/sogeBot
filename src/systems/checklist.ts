import { Checklist as ChecklistEntity } from '@entity/checklist';
import { getRepository } from 'typeorm';

import { settings, ui } from '../decorators';
import { onChange, onStreamEnd } from '../decorators/on';
import System from './_interface';

import { adminEndpoint } from '~/helpers/socket';

class Checklist extends System {
  @settings('customization')
  @ui({ type: 'configurable-list' })
    itemsArray: any[] = [];

  sockets() {
    adminEndpoint(this.nsp, 'generic::getAll', async (cb) => {
      try {
        const checkedItems = await getRepository(ChecklistEntity).find();
        cb(null, this.itemsArray, checkedItems);
      } catch(e: any) {
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
