import { OverlayMapperAlertsRegistry } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayAlertsRegistryOptionsObject } from './OverlayAlertsRegistryOptionsObject';

@ObjectType()
export class OverlayAlertsRegistryObject implements OverlayMapperAlertsRegistry {
  @Field(type => ID)
    id: string;
  @Field(type => String, { nullable: true })
    groupId: string | null;
  @Field(type => String, { nullable: true })
    name: string | null;
  @Field()
    value: 'alertsRegistry' | 'textRegistry';
  @Field(type => OverlayAlertsRegistryOptionsObject, { nullable: true })
    opts: OverlayMapperAlertsRegistry['opts'];
}