import {
  Controller,
  Get,
  Response,
  Route,
  Security,
} from 'tsoa';

import { menu, menuPublic } from '../helpers/panel';

@Route('/api/v1/menu')
export class MenuController extends Controller {
  @Response('401', 'Unauthorized')
  @Security('bearerAuth', [])
  @Get('/private')
  public async get() {
    return {
      data: menu.map((o) => ({
        category: o.category, name: o.name, id: o.id, enabled: o.this ? o.this.enabled : true,
      })),
      paging: null,
    };
  }

  @Response('401', 'Unauthorized')
  @Get('/public')
  public async getPublic() {
    return {
      data:   menuPublic,
      paging: null,
    };
  }
}