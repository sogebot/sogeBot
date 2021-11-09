import {
  Field, Float, ObjectType, 
} from 'type-graphql';

@ObjectType()
export class CustomizationTTSObject {
  @Field({ nullable: true })
    enabled: boolean;
  @Field()
    voice: string;
  @Field(type => Float)
    pitch: number;
  @Field(type => Float)
    volume: number;
  @Field(type => Float)
    rate: number;
}