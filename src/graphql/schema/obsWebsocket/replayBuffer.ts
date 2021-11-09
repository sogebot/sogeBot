import { simpleModeTasks } from '@entity/obswebsocket';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
export class ReplayBuffer implements simpleModeTasks.ReplayBuffer {
  @Field(type => ID)
  id: string;
  @Field(type => String)
  event: 'StartReplayBuffer' | 'StopReplayBuffer' | 'SaveReplayBuffer';
}