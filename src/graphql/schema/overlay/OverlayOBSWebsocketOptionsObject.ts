import { OverlayMapperOBSWebsocket } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

type OverlayMapperOBSWebsocketOptions = NonNullable<OverlayMapperOBSWebsocket['opts']>;

@ObjectType()
export class OverlayOBSWebsocketOptionsObject implements OverlayMapperOBSWebsocketOptions {
  @Field(type => [String]) allowedIPs: string[];
}