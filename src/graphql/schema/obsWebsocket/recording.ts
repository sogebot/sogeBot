import {
  Field, ID, ObjectType,
} from 'type-graphql';

import { simpleModeTasks } from '../../../database/entity/obswebsocket';

@ObjectType()
export class Recording implements simpleModeTasks.Recording {
  @Field(type => ID)
  id: string;
  @Field(type => String)
  event: 'StartRecording' | 'StopRecording' | 'PauseRecording' | 'ResumeRecording';
}