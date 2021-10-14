import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { simpleModeTasks } from '../../../database/entity/obswebsocket';

@ObjectType()
export class ReplayBuffer implements simpleModeTasks.ReplayBuffer {
  @Field(type => ID)
  id: string;
  @Field(type => String)
  event: 'StartReplayBuffer' | 'StopReplayBuffer' | 'SaveReplayBuffer';
}