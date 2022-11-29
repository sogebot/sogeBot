import {
  Alert, AlertInterface,
} from '@entity/alert';
import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { AppDataSource } from '~/database';
import { v4 } from 'uuid';

import { AlertObject } from '../schema/alert/AlertObject';

const relations = ['promo', 'rewardredeems', 'cmdredeems', 'cheers', 'follows', 'raids', 'resubs', 'subcommunitygifts', 'subgifts', 'subs', 'tips'];

@Resolver()
export class alertResolver {
  @Query(returns => [AlertObject])
  alerts(@Arg('id', { nullable: true }) id: string) {
    if (id) {
      return AppDataSource.getRepository(Alert).find({ where: { id }, relations });
    } else {
      return AppDataSource.getRepository(Alert).find({ relations });
    }
  }

  @Query(returns => Boolean)
  async alertsSettingsGet(@Arg('name') name: 'areAlertsMuted' | 'isSoundMuted' | 'isTTSMuted') {
    const alerts = (await import('../../registries/alerts')).default;
    switch(name) {
      case 'areAlertsMuted':
        return alerts.areAlertsMuted;
      case 'isSoundMuted':
        return alerts.isSoundMuted;
      case 'isTTSMuted':
        return alerts.isTTSMuted;
    }
  }

  @Mutation(returns => Boolean)
  async alertsSettingsSet(@Arg('name') name: 'areAlertsMuted' | 'isSoundMuted' | 'isTTSMuted', @Arg('value') value: boolean) {
    const alerts = (await import('../../registries/alerts')).default;
    switch(name) {
      case 'areAlertsMuted':
        alerts.areAlertsMuted = value;
        break;
      case 'isSoundMuted':
        alerts.isSoundMuted = value;
        break;
      case 'isTTSMuted':
        alerts.isTTSMuted = value;
        break;
    }
    return true;
  }

  @Authorized()
  @Mutation(returns => AlertObject)
  async alertClone(@Arg('id') id: string) {
    const item = await AppDataSource.getRepository(Alert).findOneOrFail({ where: { id }, relations });
    const clonedItem = {
      ...item,
      id:        v4(),
      updatedAt: Date.now(),
      name:      item.name + ' (clone)',
      follows:   item.follows.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      subs: item.subs.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      subgifts: item.subgifts.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      subcommunitygifts: item.subcommunitygifts.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      raids: item.raids.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      tips: item.tips.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      cheers: item.cheers.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      resubs: item.resubs.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      cmdredeems: item.cmdredeems.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      rewardredeems: item.rewardredeems.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
      promo: item.promo.map((o) => {
        return {
          ...o, id: v4(), imageId: o.imageId, soundId: o.soundId,
        };
      }),
    };
    return AppDataSource.getRepository(Alert).save(clonedItem);
  }

  @Authorized()
  @Mutation(returns => AlertObject)
  async alertSave(
  @Arg('data') data_json: string,
  ) {
    const data: AlertInterface = JSON.parse(data_json);
    const alert = await AppDataSource.getRepository(Alert).save({ ...data, updatedAt: Date.now() });
    return alert;
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async alertRemove(@Arg('id') id: string) {
    const item = await AppDataSource.getRepository(Alert).findOneBy({ id });
    if (item) {
      await AppDataSource.getRepository(Alert).remove(item);
    }
    return true;
  }
}