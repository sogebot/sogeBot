import { Checklist as ChecklistEntity } from '@entity/checklist';
import { AppDataSource } from '~/database';

import { settings, ui } from '../decorators';
import { onChange, onStreamEnd } from '../decorators/on';
import System from './_interface';

import { adminEndpoint } from '~/helpers/socket';

class Checklist extends System {
  @settings('customization')
  @ui({ type: 'configurable-list' })
    itemsArray: any[] = [];

  sockets() {
    adminEndpoint('/systems/checklist', 'generic::getAll', async (cb) => {
      try {
        const checkedItems = await AppDataSource.getRepository(ChecklistEntity).find();
        cb(null, this.itemsArray, checkedItems);
      } catch(e: any) {
        cb(e.stack, [], []);
      }
    });
    adminEndpoint('/systems/checklist', 'checklist::save', async (checklistItem, cb) => {
      await AppDataSource.getRepository(ChecklistEntity).save(checklistItem);
      if (cb) {
        cb(null);
      }
    });
  }

  @onChange('itemsArray')
  onChangeItemsArray() {
    AppDataSource.getRepository(ChecklistEntity).clear();
  }

  @onStreamEnd()
  public onStreamEnd() {
    AppDataSource.getRepository(ChecklistEntity).update({}, { isCompleted: false });
  }
}

export default new Checklist();
