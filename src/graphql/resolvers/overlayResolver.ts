import {
  Arg, Authorized, Mutation, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import {
  OverlayMapper, OverlayMapperInterface, OverlayMappers, 
} from '../../database/entity/overlay';
import { OverlayObject } from '../schema/overlay/OverlayObject';

@Resolver()
export class overlayResolver {
  @Query(returns => OverlayObject)
  async overlays(@Arg('id', { nullable: true }) id: string) {
    let items: Readonly<Required<OverlayMappers>>[];
    if (id) {
      items = await getRepository(OverlayMapper).find({ where: { id } });
    } else {
      items = await getRepository(OverlayMapper).find();
    }

    // we need to send it as OverlayObject
    const response = {
      marathon:        items.filter(o => o.value === 'marathon'),
      stopwatch:       items.filter(o => o.value === 'stopwatch'),
      countdown:       items.filter(o => o.value === 'countdown'),
      credits:         items.filter(o => o.value === 'credits'),
      eventlist:       items.filter(o => o.value === 'eventlist'),
      clips:           items.filter(o => o.value === 'clips'),
      alerts:          items.filter(o => o.value === 'alerts'),
      emotes:          items.filter(o => o.value === 'emotes'),
      emotescombo:     items.filter(o => o.value === 'emotescombo'),
      emotesfireworks: items.filter(o => o.value === 'emotesfireworks'),
      emotesexplode:   items.filter(o => o.value === 'emotesexplode'),
      hypetrain:       items.filter(o => o.value === 'hypetrain'),
      clipscarousel:   items.filter(o => o.value === 'clipscarousel'),
      tts:             items.filter(o => o.value === 'tts'),
      polls:           items.filter(o => o.value === 'polls'),
      obswebsocket:    items.filter(o => o.value === 'obswebsocket'),
      group:           items.filter(o => o.value === 'group'),
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