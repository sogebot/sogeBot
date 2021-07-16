import {
  Body,
  Controller,
  Delete,
  Get,
  Path,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';
import { getRepository } from 'typeorm';

import { parserReply } from '../commons';
import { QuickAction, QuickActions } from '../database/entity/dashboard';
import { getUserSender } from '../helpers/commons';
import { info } from '../helpers/log';

@Route('/api/v1/quickaction')
@Tags('Quick Actions')
@Security('bearerAuth', [])
export class QuickActionController extends Controller {
  /**
  * Retrieves the quick actions of an authenticated user.
  */
  @Response('401', 'Unauthorized')
  @Get()
  public async get(@Request() req: any): Promise<{ data: QuickActions.Item[], paging: null}> {
    const userId = req.user.userId as string;
    const actions = await getRepository(QuickAction).find({ where: { userId } });
    return {
      data:   actions,
      paging: null,
    };
  }
  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Post()
  public async post(@Request() req: any, @Body() requestBody: QuickActions.Item): Promise<void> {
    const userId = req.user.userId as string;
    const item = requestBody;
    try {
      if (item.order === -1) {
        item.order = await getRepository(QuickAction).count({ userId });
      }
      await getRepository(QuickAction).save({ ...item, userId });
      this.setStatus(201);

    } catch (e) {
      this.setStatus(400);
    }
    return;
  }
  @SuccessResponse('200', 'OK')
  @Response('401', 'Unauthorized')
  @Response('404', 'Not Found')
  @Post('/{id}/trigger')
  public async trigger(@Request() req: any, @Path() id: string): Promise<void> {
    const userId = req.user.userId as string;
    const username = req.user.username as string;
    try {
      const item = await getRepository(QuickAction).findOneOrFail({ where: { id, userId } });
      trigger(item, { userId, username });
      this.setStatus(200);
    } catch (e) {
      this.setStatus(404);
    }
    return;
  }
  @SuccessResponse('404', 'Not Found')
  @Delete('/{id}')
  public async delete(@Request() req: any, @Path() id: string): Promise<void> {
    const userId = req.user.userId as string;
    const item = await getRepository(QuickAction).findOne({ id, userId: String(userId) });
    if (item) {
      await getRepository(QuickAction).remove(item);

      // reorder
      const items = await getRepository(QuickAction).find({ where: { userId }, order: { order: 'ASC' } });
      for (let i = 0; i < items.length; i++) {
        await getRepository(QuickAction).save({ ...items[i], order: i });
      }
    }
    this.setStatus(404);
    return;
  }
}

const trigger = async (item: QuickActions.Item, user: { userId: string, username: string }) => {
  info(`Quick Action ${item.id} triggered by ${user.username}#${user.userId}`);
  switch (item.type) {
    case 'command': {
      const parser = new (require('../parser').default)();
      const responses = await parser.command(getUserSender(user.userId, user.username), item.options.command, true);
      for (let i = 0; i < responses.length; i++) {
        setTimeout(async () => {
          parserReply(await responses[i].response, { sender: responses[i].sender, attr: responses[i].attr });
        }, 500 * i);
      }

      break;
    }
  }
};