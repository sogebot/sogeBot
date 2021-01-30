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

import { WidgetCustom, WidgetCustomInterface } from '../database/entity/widget';

@Route('/api/v1/custom')
@Tags('Widgets')
@Security('bearerAuth', [])
export class CustomController extends Controller {
  /**
  * Retrieves the quick actions of an authenticated user.
  */
  @Response('401', 'Unauthorized')
  @Get()
  public async get(@Request() req: any): Promise<{ data: WidgetCustomInterface[], paging: null}> {
    const userId = req.user.userId as string;
    const items = await getRepository(WidgetCustom).find({
      where: { userId },
      order: { name: 'DESC' },
    });
    return {
      data:   items,
      paging: null,
    };
  }
  @SuccessResponse('201', 'Created')
  @Response('401', 'Unauthorized')
  @Post()
  public async post(@Request() req: any, @Body() requestBody: Omit<WidgetCustomInterface, 'userId'>): Promise<void> {
    const userId = req.user.userId as string;
    const item = requestBody;
    try {
      await getRepository(WidgetCustom).save({ ...item, userId });
      this.setStatus(201);

    } catch (e) {
      this.setStatus(400);
    }
    return;
  }
  @SuccessResponse('404', 'Not Found')
  @Delete('/{id}')
  public async delete(@Request() req: any, @Path() id: string): Promise<void> {
    const userId = req.user.userId as string;
    const item = await getRepository(WidgetCustom).findOne({ id: req.params.id, userId: String(userId) });
    if (item) {
      await getRepository(WidgetCustom).remove(item);
    }
    this.setStatus(404);
    return;
  }
}