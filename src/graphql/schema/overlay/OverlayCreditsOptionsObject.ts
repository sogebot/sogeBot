import { OverlayMapperCredits } from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { OverlayCreditsOptionsClipsObject } from './OverlayCreditsOptionsClipsObject';
import { OverlayCreditsOptionsCustomTextsObject } from './OverlayCreditsOptionsCustomTextsObject';
import { OverlayCreditsOptionsShowObject } from './OverlayCreditsOptionsShowObject';
import { OverlayCreditsOptionsSocialObject } from './OverlayCreditsOptionsSocialObject';
import { OverlayCreditsOptionsTextObject } from './OverlayCreditsOptionsTextObject';

type OverlayMapperCreditsOptions = NonNullable<OverlayMapperCredits['opts']>;

@ObjectType()
export class OverlayCreditsOptionsObject implements OverlayMapperCreditsOptions {
  @Field(type => [OverlayCreditsOptionsSocialObject])
    social: OverlayCreditsOptionsSocialObject[];
  @Field()
    speed: 'slow' | 'fast' | 'very slow' | 'medium' | 'very fast';
  @Field(type => [OverlayCreditsOptionsCustomTextsObject])
    customTexts: OverlayCreditsOptionsCustomTextsObject[];
  @Field(type => OverlayCreditsOptionsClipsObject)
    clips: OverlayCreditsOptionsClipsObject;
  @Field(type => OverlayCreditsOptionsTextObject)
    text: OverlayCreditsOptionsTextObject;
  @Field(type => OverlayCreditsOptionsShowObject)
    show: OverlayCreditsOptionsShowObject;
}