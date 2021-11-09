import { simpleModeTasks } from '@entity/obswebsocket';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
export class Recording implements simpleModeTasks.Recording {
  @Field(type => ID)
    id: string;
  @Field(type => String)
    event: 'StartRecording' | 'StopRecording' | 'PauseRecording' | 'ResumeRecording';
}