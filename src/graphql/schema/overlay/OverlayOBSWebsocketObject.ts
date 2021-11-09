import { OverlayMapperOBSWebsocket } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { OverlayOBSWebsocketOptionsObject } from './OverlayOBSWebsocketOptionsObject';

@ObjectType()
export class OverlayOBSWebsocketObject implements OverlayMapperOBSWebsocket {
  @Field(type => ID)
    id: string;
  @Field()
    value: 'obswebsocket';
  @Field(type => OverlayOBSWebsocketOptionsObject, { nullable: true })
    opts: OverlayMapperOBSWebsocket['opts'];
}