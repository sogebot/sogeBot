import { Carousel } from '@entity/carousel';
import {
  Arg, Query, Resolver,
} from 'type-graphql';
import { getRepository } from 'typeorm';

import { CarouselObject } from '../schema/carousel/carouselObject';

@Resolver()
export class CarouselResolver {
  @Query(returns => [CarouselObject])
  async carousels(@Arg('id', { nullable: true }) id: string) {
    if (id) {
      return getRepository(Carousel).find({
        where:  { id }, select: [
          'id', 'order', 'waitAfter',
          'waitBefore', 'duration',
          'animationIn', 'animationInDuration',
          'animationOut', 'animationOutDuration', 'showOnlyOncePerStream',
        ],
      });
    } else {
      return getRepository(Carousel).find({
        select: [
          'id', 'order', 'waitAfter',
          'waitBefore', 'duration',
          'animationIn', 'animationInDuration',
          'animationOut', 'animationOutDuration', 'showOnlyOncePerStream',
        ],
        order: { order: 'ASC' },
      });
    }
  }
}