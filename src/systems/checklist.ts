import { Checklist as ChecklistEntity } from '@entity/checklist.js';

import System from './_interface.js';
import { onChange, onStreamEnd } from '../decorators/on.js';
import { settings } from '../decorators.js';

import { Get, Post } from '~/decorators/endpoint.js';

class Checklist extends System {
  @settings('customization')
    itemsArray: any[] = [];

  ///////////////////////// <! API endpoints
  @Get('/')
  async findAll() {
    const checkedItems = await ChecklistEntity.find();
    return this.itemsArray.map(it => ({ id: it, isCompleted: checkedItems.find(cit => cit.id === it)?.isCompleted ?? false }));
  }
  @Post('/')
  saveOneGroup(req: any) {
    return ChecklistEntity.create(req.body).save();
  }
  ///////////////////////// API endpoints />

  @onChange('itemsArray')
  onChangeItemsArray() {
    ChecklistEntity.clear();
  }

  @onStreamEnd()
  public onStreamEnd() {
    ChecklistEntity.update({}, { isCompleted: false });
  }
}

export default new Checklist();
