import {
  Arg, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { OverlayMapper, OverlayMappers } from '../../database/entity/overlay';
import { OverlayObject } from '../schema/overlay/OverlayObject';

@Resolver()
export class overlayResolver {
  @Query(returns => [OverlayObject])
  async overlays(@Arg('id', { nullable: true }) id: string) {
    let items: Readonly<Required<OverlayMappers>>[];
    if (id) {
      items = await getRepository(OverlayMapper).find({ where: { id } });
    } else {
      items = await getRepository(OverlayMapper).find();
    }

    // we need to send it as OverlayObject
    return {
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
  }
}