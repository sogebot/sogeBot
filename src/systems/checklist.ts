import { Checklist as ChecklistEntity } from '@entity/checklist.js';

import System from './_interface.js';
import { onChange, onStreamEnd } from '../decorators/on.js';
import { settings } from '../decorators.js';

import { app } from '~/helpers/panel.js';
import { withScope } from '~/helpers/socket.js';

class Checklist extends System {
  @settings('customization')
    itemsArray: any[] = [];

  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/checklist', withScope([this.scope('read'), this.scope('manage')]), async (req, res) => {
      const checkedItems = await ChecklistEntity.find();
      res.send({
        status: 'success',
        data:   {
          items: this.itemsArray.map(it => ({ id: it, isCompleted: checkedItems.find(cit => cit.id === it)?.isCompleted ?? false })),
        },
      });
    });
    app.post('/api/systems/checklist',  withScope([this.scope('manage')]), async (req, res) => {
      try {
        await ChecklistEntity.create(req.body).save();
        res.send({
          status: 'success',
        });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
    });
  }

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
