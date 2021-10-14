import {
  OverlayMapperAlerts,
  OverlayMapperCarousel,
  OverlayMapperClips,
  OverlayMapperClipsCarousel,
  OverlayMapperCountdown, OverlayMapperCredits, OverlayMapperEmotes, OverlayMapperEmotesCombo, OverlayMapperEmotesExplode, OverlayMapperEmotesFireworks, OverlayMapperEventlist, OverlayMapperGroup, OverlayMapperHypeTrain, OverlayMapperMarathon, OverlayMapperOBSWebsocket, OverlayMapperPolls, OverlayMapperStopwatch, OverlayMapperTTS,
} from '@entity/overlay';
import { Field, ObjectType } from 'type-graphql';

import { OverlayAlertsObject } from './OverlayAlertsObject';
import { OverlayCarouselObject } from './OverlayCarouselObject';
import { OverlayClipsCarouselObject } from './OverlayClipsCarouselObject';
import { OverlayClipsObject } from './OverlayClipsObject';
import { OverlayCountdownObject } from './OverlayCountdownObject';
import { OverlayCreditsObject } from './OverlayCreditsObject';
import { OverlayEmotesComboObject } from './OverlayEmotesComboObject';
import { OverlayEmotesExplodeObject } from './OverlayEmotesExplodeObject';
import { OverlayEmotesFireworksObject } from './OverlayEmotesFireworksObject';
import { OverlayEmotesObject } from './OverlayEmotesObject';
import { OverlayEventlistObject } from './OverlayEventlistObject';
import { OverlayGroupObject } from './OverlayGroupObject';
import { OverlayHypeTrainObject } from './OverlayHypeTrainObject';
import { OverlayMarathonObject } from './OverlayMarathonObject';
import { OverlayOBSWebsocketObject } from './OverlayOBSWebsocketObject';
import { OverlayPollsObject } from './OverlayPollsObject';
import { OverlayStopwatchObject } from './OverlayStopwatchObject';
import { OverlayTTSObject } from './OverlayTTSObject';

@ObjectType()
export class OverlayObject {
  @Field(type => [OverlayMarathonObject])
  marathon: OverlayMapperMarathon[];
  @Field(type => [OverlayStopwatchObject])
  stopwatch: OverlayMapperStopwatch[];
  @Field(type => [OverlayCountdownObject])
  countdown: OverlayMapperCountdown[];
  @Field(type => [OverlayCreditsObject])
  credits: OverlayMapperCredits[];
  @Field(type => [OverlayEventlistObject])
  eventlist: OverlayMapperEventlist[];
  @Field(type => [OverlayClipsObject])
  clips: OverlayMapperClips[];
  @Field(type => [OverlayAlertsObject])
  alerts: OverlayMapperAlerts[];
  @Field(type => [OverlayEmotesObject])
  emotes: OverlayMapperEmotes[];
  @Field(type => [OverlayEmotesComboObject])
  emotescombo: OverlayMapperEmotesCombo[];
  @Field(type => [OverlayEmotesFireworksObject])
  emotesfireworks: OverlayMapperEmotesFireworks[];
  @Field(type => [OverlayEmotesExplodeObject])
  emotesexplode: OverlayMapperEmotesExplode[];
  @Field(type => [OverlayHypeTrainObject])
  hypetrain: OverlayMapperHypeTrain[];
  @Field(type => [OverlayClipsCarouselObject])
  clipscarousel: OverlayMapperClipsCarousel[];
  @Field(type => [OverlayTTSObject])
  tts: OverlayMapperTTS[];
  @Field(type => [OverlayPollsObject])
  polls: OverlayMapperPolls[];
  @Field(type => [OverlayOBSWebsocketObject])
  obswebsocket: OverlayMapperOBSWebsocket[];
  @Field(type => [OverlayGroupObject])
  group: OverlayMapperGroup[];
  @Field(type => [OverlayCarouselObject])
  carousel: OverlayMapperCarousel[];
}