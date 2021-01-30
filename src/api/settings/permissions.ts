import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Path,
  Post,
  Route,
  Security,
  Tags,
} from 'tsoa';
import { getRepository } from 'typeorm';

import { Permissions as PermissionsEntity, PermissionsInterface } from '../../database/entity/permissions';
import { error } from '../../helpers/log';
import { cleanViewersCache } from '../../helpers/permissions';

@Route('/api/v1/settings/permissions')
@Tags('Settings / Permissions')
export class SettingsPermissionsController extends Controller {
  @Security('bearerAuth', [])
  @Get('/')
  public async getAll(): Promise<{ data: PermissionsInterface[], paging: null}> {
    cleanViewersCache();
    return {
      data: await getRepository(PermissionsEntity).find({
        relations: ['filters'],
        order:     { order: 'ASC' },
      }),
      paging: null,
    };
  }

  @Security('bearerAuth', [])
  @Patch('/{id}')
  public async patchOne(@Path() id: string, @Body() requestBody: Partial<PermissionsInterface>): Promise<PermissionsInterface | void> {
    cleanViewersCache();
    return await getRepository(PermissionsEntity).save({ ...requestBody, id });
  }

  @Security('bearerAuth', [])
  @Get('/{id}')
  public async getOne(@Path() id: string): Promise<PermissionsInterface | void> {
    cleanViewersCache();
    return await getRepository(PermissionsEntity).findOne({
      where:     { id },
      relations: ['filters'],
      order:     { order: 'ASC' },
    });
  }

  @Security('bearerAuth', [])
  @Post('/')
  public async create(@Body() requestBody: PermissionsInterface): Promise<PermissionsInterface | string> {
    try {
      cleanViewersCache();
      return await getRepository(PermissionsEntity).save(requestBody);
    } catch (e) {
      this.setStatus(500);
      error(e);
      return 'Unexpected error during create.';
    }
  }

  @Security('bearerAuth', [])
  @Delete('/{id}')
  public async deleteOne(@Path() id: string): Promise<PermissionsInterface | void> {
    cleanViewersCache();
    await getRepository(PermissionsEntity).delete({ id: String(id) });
    return;
  }
}