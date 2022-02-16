import { OverlayMapperAlertsRegistry } from '@entity/overlay';
import {
  Field, ObjectType,
} from 'type-graphql';

type OverlayMapperAlertsRegistryOptions = NonNullable<OverlayMapperAlertsRegistry['opts']>;

@ObjectType()
export class OverlayAlertsRegistryOptionsObject implements OverlayMapperAlertsRegistryOptions {
  @Field() id: string;
}