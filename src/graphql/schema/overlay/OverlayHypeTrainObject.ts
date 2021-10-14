import { OverlayMapperHypeTrain } from '@entity/overlay';
import {
  Field, ID, ObjectType,
} from 'type-graphql';

@ObjectType()
export class OverlayHypeTrainObject implements OverlayMapperHypeTrain {
  @Field(type => ID)
  id: string;
  @Field()
  value: 'hypetrain';
  opts: null;
}