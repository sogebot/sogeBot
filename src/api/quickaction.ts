import {
  Body,
  Controller,
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
import { setValueOf } from '../helpers/customvariables/setValueOf';
import { info } from '../helpers/log';

@Route('/api/v1/quickaction')
@Tags('Quick Actions')
@Security('bearerAuth', [])
export class QuickActionController extends Controller {
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

    } catch (e: any) {
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
      trigger(item, { userId, username }, req.body.value);
      this.setStatus(200);
    } catch (e: any) {
      this.setStatus(404);
    }
    return;
  }
}

const trigger = async (item: QuickActions.Item, user: { userId: string, username: string }, value?: string) => {
  info(`Quick Action ${item.id} triggered by ${user.username}#${user.userId}`);
  switch (item.type) {
    case 'command': {
      const parser = new (require('../parser').default)();
      const responses = await parser.command(getUserSender(user.userId, user.username), item.options.command, true);
      for (let i = 0; i < responses.length; i++) {
        await parserReply(responses[i].response, { sender: responses[i].sender, attr: responses[i].attr });
      }

      break;
    }
    case 'customvariable': {
      setValueOf(item.options.customvariable, value, {});
      break;
    }
  }
};