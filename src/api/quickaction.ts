import {
  Body,
  Controller,
  Post,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';
import { getRepository } from 'typeorm';

import { QuickAction, QuickActions } from '../database/entity/dashboard';

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
}