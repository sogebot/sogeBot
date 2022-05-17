import {
  OverlayMapper, OverlayMapperClipsCarousel, OverlayMapperInterface, OverlayMappers,
} from '@entity/overlay';
import { SECOND } from '@sogebot/ui-helpers/constants';
import { defaults, pick } from 'lodash';
import {
  Arg, Authorized,  Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { isBotStarted } from '../../helpers/database';
import { OverlayObject } from '../schema/overlay/OverlayObject';

const ticks: string[] = [];

setInterval(async () => {
  if (!isBotStarted) {
    return;
  }

  while(ticks.length > 0) {
    let id = ticks.shift() as string;
    let time: number | string = 1000;
    if (id.includes('|')) {
      [id, time] = id.split('|');
    }
    // check if it is without group
    const item = await getRepository(OverlayMapper).findOne({ id });
    if (item) {
      if (item.value === 'countdown' && item.opts) {
        await getRepository(OverlayMapper).update(id, {
          opts: {
            ...item.opts,
            currentTime: Number(time),
          },
        });
      } else if (item.value === 'stopwatch' && item.opts) {
        await getRepository(OverlayMapper).update(id, {
          opts: {
            ...item.opts,
            currentTime: Number(time),
          },
        });
      }
    }
  }
}, SECOND * 1);

@Resolver()
export class overlayResolver {
  @Query(returns => OverlayObject)
  async overlays(
  @Arg('id', { nullable: true }) id: string,
    @Arg('groupId', { nullable: true }) groupId: string,
    @Arg('allowGroups', { nullable: true }) allowGroups: boolean
  ) {
    let items: Readonly<Required<OverlayMappers>>[];
    if (id) {
      items = await getRepository(OverlayMapper).find({ where: { id } });
    } else if (groupId) {
      items = await getRepository(OverlayMapper).find({ where: { groupId } });
    } else {
      if (!allowGroups) {
        items = await getRepository(OverlayMapper).find({ where: { groupId: null } });
      } else {
        items = await getRepository(OverlayMapper).find();
      }
    }

    // we need to send it as OverlayObject
    const response = {
      alertsRegistry:  items.filter(o => o.value === 'alertsRegistry'),
      textRegistry:    items.filter(o => o.value === 'textRegistry'),
      marathon:        items.filter(o => o.value === 'marathon'),
      stopwatch:       items.filter(o => o.value === 'stopwatch'),
      countdown:       items.filter(o => o.value === 'countdown'),
      credits:         items.filter(o => o.value === 'credits'),
      eventlist:       items.filter(o => o.value === 'eventlist'),
      clips:           items.filter(o => o.value === 'clips'),
      media:           items.filter(o => o.value === 'media'),
      emotes:          items.filter(o => o.value === 'emotes'),
      emotescombo:     items.filter(o => o.value === 'emotescombo'),
      emotesfireworks: items.filter(o => o.value === 'emotesfireworks'),
      emotesexplode:   items.filter(o => o.value === 'emotesexplode'),
      hypetrain:       items.filter(o => o.value === 'hypetrain'),
      clipscarousel:   (items.filter(o => o.value === 'clipscarousel') as OverlayMapperClipsCarousel[]).map((value) => {
        value.opts = pick(
          defaults(value.opts, {
            volume:       0,
            customPeriod: 31,
            numOfClips:   20,
            animation:    'slide',
          }),
          ['volume', 'customPeriod', 'numOfClips', 'animation'],
        );
        return value;
      }),
      carousel:     items.filter(o => o.value === 'carousel'),
      tts:          items.filter(o => o.value === 'tts'),
      polls:        items.filter(o => o.value === 'polls'),
      obswebsocket: items.filter(o => o.value === 'obswebsocket'),
      group:        items.filter(o => o.value === 'group'),
      stats:        items.filter(o => o.value === 'stats'),
      wordcloud:    items.filter(o => o.value === 'wordcloud'),
      randomizer:   items.filter(o => o.value === 'randomizer'),
      reference:    items.filter(o => o.value === 'reference'),
      chat:         items.filter(o => o.value === 'chat'),
    } as OverlayObject;
    return response;
  }

  @Authorized()
  @Mutation(returns => String)
  async overlaysSave(
  @Arg('data') data_json: string,
  ) {
    const data: OverlayMapperInterface = JSON.parse(data_json);
    const item = await getRepository(OverlayMapper).save(data);
    return item.id;
  }

  @Mutation(returns => Boolean)
  async overlaysTick(@Arg('id') id: string, @Arg('millis') millis: number) {
    ticks.push(`${id}|${millis}`);
    return true;
  }

  @Authorized()
  @Mutation(returns => Boolean)
  async overlaysRemove(@Arg('id') id: string) {
    const item = await getRepository(OverlayMapper).findOne({ id });
    if (item) {
      await getRepository(OverlayMapper).remove(item);
    }
    return true;
  }
}