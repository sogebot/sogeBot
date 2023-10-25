import { IsNotEmpty, MinLength } from 'class-validator';
import { BeforeInsert, BeforeUpdate } from 'typeorm';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { BotEntity } from '../BotEntity.js';

export interface EmitData {
  alertId?: string;
  name: string;
  amount: number;
  tier: null | 'Prime' | '1' | '2' | '3';
  recipient?: string;
  game?: string;
  service?: string;
  rewardId?: string;
  currency: string;
  monthsName: string;
  event: Alert['items'][number]['type'];
  message: string;
  customOptions?: {
    volume?: number;
    alertDuration? : number;
    textDelay? : number;
    layout? : number;
    messageTemplate? : string;
    audioId? : string;
    mediaId? : string;

    animationIn?: string;
    animationInDuration?: number;
    animationInWindowBoundaries?: boolean;

    animationOut?: string;
    animationOutDuration?: number;
    animationOutWindowBoundaries?: boolean;

    animationText?: any;
    animationTextOptions?: any;

    components?: {
      [componentId: string]: any
    }
  }
}

export type Filter = {
  operator: string;
  items: (Filter | {
    comparator: string;
    value: string | number;
    type: string;
    typeof: string;
  })[]
} | null;

type Item<T> = {
  id: string;
  type: T,
  alertId?: string;
  enabled: boolean;
  title: string;
  variantAmount: number;
  messageTemplate: string;
  ttsTemplate: string;
  layout: '0' | '1' | '2' | '3' | '4' | '5';
  /*
   * JSON type of Filter
   */
  filter: string | null;
  animationInDuration: number;
  animationIn: 'none' | 'fadeIn' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
  | 'fadeInUp' | 'fadeInDownBig' | 'fadeInLeftBig' | 'fadeInRightBig'
  | 'fadeInUpBig' | 'bounceIn' | 'bounceInDown' | 'bounceInLeft'
  | 'bounceInRight' | 'bounceInUp' | 'flipInX' | 'flipInY' | 'lightSpeedIn'
  | 'rotateIn' | 'rotateInDownLeft' | 'rotateInDownRight' | 'rotateInUpLeft'
  | 'rotateInUpRight' | 'slideInDown' | 'slideInLeft' | 'slideInRight'
  | 'slideInUp' | 'zoomIn' | 'zoomInDown' | 'zoomInLeft' | 'zoomInRight'
  | 'zoomInUp' | 'rollIn' | 'jackInTheBox';
  animationOutDuration: number;
  animationOut: 'none' | 'fadeOut' | 'fadeOutDown' | 'fadeOutLeft' | 'fadeOutRight' | 'fadeOutUp'
  | 'fadeOutDownBig' | 'fadeOutLeftBig' | 'fadeOutRightBig' | 'fadeOutUpBig'
  | 'bounceOut' | 'bounceOutDown' | 'bounceOutLeft' | 'bounceOutRight'
  | 'bounceOutUp' | 'flipOutX' | 'flipOutY' | 'lightSpeedOut' | 'rotateOut'
  | 'rotateOutDownLeft' | 'rotateOutDownRight' | 'rotateOutUpLeft'
  | 'rotateOutUpRight' | 'slideOutDown' | 'slideOutLeft' | 'slideOutRight'
  | 'slideOutUp' | 'zoomOut' | 'zoomOutDown' | 'zoomOutLeft' | 'zoomOutRight'
  | 'zoomOutUp' | 'rollOut';
  animationText: 'none' | 'baffle' | 'bounce' | 'bounce2' | 'flip' | 'flash' | 'pulse2' | 'rubberBand'
  | 'shake2' | 'swing' | 'tada' | 'wave' | 'wobble' | 'wiggle' | 'wiggle2' | 'jello' | 'typewriter';
  animationTextOptions: {
    speed: number | 'slower' | 'slow' | 'fast' | 'faster';
    maxTimeToDecrypt: number;
    characters: string;
  };
  imageId: string | null;
  imageOptions: {
    translateX: number;
    translateY: number;
    scale: number;
    loop: boolean;
  };
  soundId: string | null;
  soundVolume: number;
  tts: {
    enabled: boolean;
    skipUrls: boolean | null;
    keepAlertShown: boolean;
    minAmountToPlay: number | null;
  };
  alertDurationInMs: number;
  alertTextDelayInMs: number;
  enableAdvancedMode: boolean;
  advancedMode: {
    html: null | string;
    css: string;
    js: null | string;
  };
  font: {
    align: 'left' | 'center' | 'right';
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    highlightcolor: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  } | null;
};

@Entity()
export class Alert extends BotEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column({ nullable: true, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    updatedAt: string | null;
  @BeforeInsert()
  @BeforeUpdate()
  generateUpdatedAt() {
    this.updatedAt = new Date().toISOString();
  }

  @Column()
  @IsNotEmpty()
  @MinLength(3)
    name: string;

  @Column()
    alertDelayInMs: number;

  @Column()
    profanityFilterType: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    loadStandardProfanityList: {
    cs: boolean;
    en: boolean;
    ru: boolean;
  };

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    parry: {
    enabled: boolean,
    delay: number,
  };

  @Column({ nullable: true, type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    tts: {
    voice: string;
    pitch: number;
    volume: number;
    rate: number;
  } | null;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    fontMessage: {
    align: 'left' | 'center' | 'right';
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[]
  };

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    font: {
    align: 'left' | 'center' | 'right';
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    highlightcolor: string;
    shadow: {
      shiftRight: number;
      shiftDown: number;
      blur: number;
      opacity: number;
      color: string;
    }[];
  };
  @Column()
    customProfanityList: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    items: (
    Item<'follow'> |
    Item<'sub'> |
    Item<'resub'> & Message |
    Item<'subgift'> |
    Item<'subcommunitygift'> |
    Item<'raid'> |
    Item<'custom'> |
    Item<'promo'> & Message |
    Item<'tip'> & Message<number> |
    Item<'cheer'> & Message<number> |
    Item<'rewardredeem'> & { rewardId: null | string }
  )[];
}

type Message<minAmountToShow extends number | undefined = undefined> = {
  message: {
    minAmountToShow: minAmountToShow,
    allowEmotes: {
      twitch: boolean;
      ffz: boolean;
      bttv: boolean;
    };
    font: {
      align: 'left' | 'center' | 'right';
      family: string;
      size: number;
      borderPx: number;
      borderColor: string;
      weight: number;
      color: string;
      shadow: {
        shiftRight: number;
        shiftDown: number;
        blur: number;
        opacity: number;
        color: string;
      }[];
    } | null;
  };
};