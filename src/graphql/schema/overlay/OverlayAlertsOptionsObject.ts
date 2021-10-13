import { OverlayMapperAlerts } from '@entity/overlay';
import {
  Field, Int, ObjectType,
} from 'type-graphql';

type OverlayMapperAlertsOptions = NonNullable<OverlayMapperAlerts['opts']>;

@ObjectType()
export class OverlayAlertsOptionsObject implements OverlayMapperAlertsOptions {
  @Field() galleryCache: boolean;
  @Field(type => Int) galleryCacheLimitInMb: number;
}