import Widget from './_interface.js';
import { WidgetCustom } from '../database/entity/widget.js';

import { AppDataSource } from '~/database.js';
import { Delete, Get, Post } from '~/decorators/endpoint.js';

class Custom extends Widget {
  @Get('/')
  getAll(req: any) {
    return AppDataSource.getRepository(WidgetCustom).find({
      where: { userId: req.headers.authUser.userId },
      order: { name: 'DESC' },
    });
  }

  @Post('/')
  async save(req: any) {
    const item = req.body;
    item.userId = req.headers.authUser.userId;
    return AppDataSource.getRepository(WidgetCustom).save(item);
  }

  @Delete('/:id')
  async deleteOne(req: any) {
    await AppDataSource.getRepository(WidgetCustom).delete({ id: req.params.id, userId: req.headers.authUser.userId });
  }
}

export default new Custom();
