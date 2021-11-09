import OBSWebsocket from 'obs-websocket-js';
import {
  Field, ID, Int, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class SceneItem implements OBSWebsocket.SceneItem {
  @Field(type => ID)
    id: number;
  @Field(type => Int)
    cx: number;
  @Field(type => Int)
    cy: number;
  @Field(type => Int)
    alignment: number;
  @Field()
    name: string;
  @Field()
    render: boolean;
  @Field()
    muted: boolean;
  @Field()
    locked: boolean;
  @Field(type => Int)
    source_cx: number;
  @Field(type => Int)
    source_cy: number;
  @Field()
    type: string;
  @Field(type => Int)
    volume: number;
  @Field(type => Int)
    x: number;
  @Field(type => Int)
    y: number;
  @Field({ nullable: true })
    parentGroupName?: string;
  @Field(type => [SceneItem])
    groupChildren?: OBSWebsocket.SceneItem[];
}

@ObjectType()
export class Scene implements OBSWebsocket.Scene {
  @Field(type => ID)
    id: string;
  @Field()
    name: string;
  @Field(type => [SceneItem])
    sources: OBSWebsocket.SceneItem[];
}