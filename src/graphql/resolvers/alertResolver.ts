import {
  Alert, AlertInterface, AlertMedia,
} from '@entity/alert';
import shortid from 'shortid';
import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import {
  getRepository, In, Not,
} from 'typeorm';
import { v4 } from 'uuid';

import { AlertObject } from '../schema/alert/AlertObject';

async function clearMedia(): Promise<void> {
  try {
    const alerts = await getRepository(Alert).find({ relations: ['rewardredeems', 'cmdredeems', 'cheers', 'follows', 'hosts', 'raids', 'resubs', 'subcommunitygifts', 'subgifts', 'subs', 'tips'] });
    const mediaIds: string[] = [];
    for (const alert of alerts) {
      for (const event of [
        ...alert.cheers,
        ...alert.follows,
        ...alert.hosts,
        ...alert.raids,
        ...alert.resubs,
        ...alert.subgifts,
        ...alert.subcommunitygifts,
        ...alert.subs,
        ...alert.tips,
        ...alert.cmdredeems,
        ...alert.rewardredeems,
      ]) {
        mediaIds.push(event.imageId);
        mediaIds.push(event.soundId);
      }
    }
    if (mediaIds.length > 0) {
      await getRepository(AlertMedia).delete({ id: Not(In(mediaIds)) });
    }
  } catch (e: any) {
    console.error(e);
  }
  return;
}

const relations = ['rewardredeems', 'cmdredeems', 'cheers', 'follows', 'hosts', 'raids', 'resubs', 'subcommunitygifts', 'subgifts', 'subs', 'tips'];

@Resolver()
export class alertResolver {
  @Query(returns => [AlertObject])
  alerts(@Arg('id', { nullable: true }) id: string) {
    if (id) {
      return getRepository(Alert).find({ where: { id }, relations });
    } else {
      return getRepository(Alert).find({ relations });
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
    const item = await getRepository(Alert).findOneOrFail({ where: { id }, relations });
    const mediaMap = new Map() as Map<string, string>;
    const clonedItem = {
      ...item,
      id:        v4(),
      updatedAt: Date.now(),
      name:      item.name + ' (clone)',
      follows:   item.follows.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      subs: item.subs.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      subgifts: item.subgifts.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      subcommunitygifts: item.subcommunitygifts.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      hosts: item.hosts.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      raids: item.raids.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      tips: item.tips.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      cheers: item.cheers.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      resubs: item.resubs.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      cmdredeems: item.cmdredeems.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
      rewardredeems: item.rewardredeems.map((o) => {
        mediaMap.set(o.soundId, v4());
        mediaMap.set(o.imageId, v4());
        return {
          ...o, id: v4(), imageId: mediaMap.get(o.imageId), soundId: mediaMap.get(o.soundId),
        };
      }),
    };

    // save media
    for (const mediaId of mediaMap.keys()) {
      const media = await getRepository(AlertMedia).findOne({ id: mediaId });
      if (media) {
        await getRepository(AlertMedia).save({
          ...media,
          id: mediaMap.get(mediaId),
        });
      }
    }
    return getRepository(Alert).save(clonedItem);
  }

  @Authorized()
  @Mutation(returns => AlertObject)
  async alertSave(
  @Arg('data') data_json: string,
  ) {
    const data: AlertInterface = JSON.parse(data_json);
    const alert = await getRepository(Alert).save({ ...data, updatedAt: Date.now() });
    await clearMedia();
    return alert;
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async alertRemove(@Arg('id') id: string) {
    const item = await getRepository(Alert).findOne({ id });
    if (item) {
      await getRepository(Alert).remove(item);
      await clearMedia();
    }
    return true;
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async alertMediaRemove(@Arg('id') id: string) {
    await getRepository(AlertMedia).delete({ id });
    return true;
  }

  @Authorized()
  @Mutation(returns => String)
  async alertMediaUpload(
  @Arg('data') b64data: string, @Arg('id', { nullable: true }) inputId?: string,
  ) {
    const id = inputId ? inputId : shortid();
    const item = await getRepository(AlertMedia).save({
      id, b64data, chunkNo: 0,
    });
    return item.id;
  }
}