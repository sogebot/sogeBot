import type { EntitySchemaColumnOptions } from 'typeorm';
import { EntitySchema } from 'typeorm';

import { ColumnNumericTransformer } from './_transformer';

export interface EmitData {
  name: string;
  amount: number;
  tier: null | 'Prime' | '1' | '2' | '3';
  recipient?: string;
  currency: string;
  monthsName: string;
  event: keyof Omit<AlertInterface, 'id' | 'updatedAt' | 'name' |'alertDelayInMs' | 'profanityFilterType' | 'loadStandardProfanityList' | 'customProfanityList' | 'tts' | 'font' | 'fontMessage'>;
  message: string;
}

type Filter = {
  operator: string;
  items: (Filter | {
    comparator: string;
    value: string;
    type: string;
    typeof: string;
  })[]
} | null;

export interface CommonSettingsInterface {
  id?: string;
  alertId?: string;
  enabled: boolean;
  title: string;
  variantAmount: number;
  messageTemplate: string;
  layout: '1' | '2' | '3' | '4' | '5';
  filter: Filter;
  animationInDuration: number;
  animationIn: 'fadeIn' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
  | 'fadeInUp' | 'fadeInDownBig' | 'fadeInLeftBig' | 'fadeInRightBig'
  | 'fadeInUpBig' | 'bounceIn' | 'bounceInDown' | 'bounceInLeft'
  | 'bounceInRight' | 'bounceInUp' | 'flipInX' | 'flipInY' | 'lightSpeedIn'
  | 'rotateIn' | 'rotateInDownLeft' | 'rotateInDownRight' | 'rotateInUpLeft'
  | 'rotateInUpRight' | 'slideInDown' | 'slideInLeft' | 'slideInRight'
  | 'slideInUp' | 'zoomIn' | 'zoomInDown' | 'zoomInLeft' | 'zoomInRight'
  | 'zoomInUp' | 'rollIn' | 'jackInTheBox';
  animationOutDuration: number;
  animationOut: 'fadeOut' | 'fadeOutDown' | 'fadeOutLeft' | 'fadeOutRight' | 'fadeOutUp'
  | 'fadeOutDownBig' | 'fadeOutLeftBig' | 'fadeOutRightBig' | 'fadeOutUpBig'
  | 'bounceOut' | 'bounceOutDown' | 'bounceOutLeft' | 'bounceOutRight'
  | 'bounceOutUp' | 'flipOutX' | 'flipOutY' | 'lightSpeedOut' | 'rotateOut'
  | 'rotateOutDownLeft' | 'rotateOutDownRight' | 'rotateOutUpLeft'
  | 'rotateOutUpRight' | 'slideOutDown' | 'slideOutLeft' | 'slideOutRight'
  | 'slideOutUp' | 'zoomOut' | 'zoomOutDown' | 'zoomOutLeft' | 'zoomOutRight'
  | 'zoomOutUp' | 'rollOut';
  animationText: 'none' | 'baffle' | 'bounce' | 'bounce2' | 'flip' | 'flash' | 'pulse2' | 'rubberBand'
  | 'shake2' | 'swing' | 'tada' | 'wave' | 'wobble' | 'wiggle' | 'wiggle2' | 'jello';
  animationTextOptions: {
    speed: number | 'slower' | 'slow' | 'fast' | 'faster';
    maxTimeToDecrypt: number;
    characters: string;
  };
  imageId: string;
  imageOptions: {
    translateX: number;
    translateY: number;
    scale: number;
  };
  soundId: string;
  soundVolume: number;
  alertDurationInMs: number;
  alertTextDelayInMs: number;
  enableAdvancedMode: boolean;
  advancedMode: {
    html: null | string;
    css: string;
    js: null | string;
  };
  tts: {
    enabled: boolean;
    skipUrls: boolean;
    keepAlertShown: boolean;
    minAmountToPlay: number;
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
  alert?: AlertInterface;
}

export interface AlertInterface {
  id?: string;
  updatedAt?: number;
  name: string;
  alertDelayInMs: number;
  profanityFilterType: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';
  loadStandardProfanityList: {
    cs: boolean;
    en: boolean;
    ru: boolean;
  };
  tts: {
    voice: string;
    pitch: number;
    volume: number;
    rate: number;
  } | null;
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
  customProfanityList: string;
  follows: CommonSettingsInterface[];
  subs: CommonSettingsInterface[];
  subgifts: CommonSettingsInterface[];
  subcommunitygifts: CommonSettingsInterface[];
  hosts: CommonSettingsInterface[];
  raids: CommonSettingsInterface[];
  tips: AlertTipInterface[];
  cheers: AlertTipInterface[];
  resubs: AlertResubInterface[];
  cmdredeems: CommonSettingsInterface[];
  rewardredeems: AlertRewardRedeemInterface[];
}

export interface AlertMediaInterface {
  primaryId: number;
  id: string;
  b64data: string;
  chunkNo: number;
}

export interface AlertRewardRedeemInterface extends AlertTipInterface {
  rewardId: null | string;
}

export interface AlertTipInterface extends CommonSettingsInterface {
  message: {
    minAmountToShow: number;
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
}
export interface AlertResubInterface extends CommonSettingsInterface {
  message: {
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
}

export const CommonSettingsSchema = {
  id: {
    type: 'uuid', primary: true, generated: 'uuid',
  } as EntitySchemaColumnOptions,
  alertId: {
    nullable: true, name: 'alertId', type: String,
  } as EntitySchemaColumnOptions,
  enabled:              { type: Boolean } as EntitySchemaColumnOptions,
  title:                { type: String } as EntitySchemaColumnOptions,
  variantAmount:        { type: Number } as EntitySchemaColumnOptions,
  messageTemplate:      { type: String } as EntitySchemaColumnOptions,
  layout:               { type: 'varchar' } as EntitySchemaColumnOptions,
  animationIn:          { type: 'varchar' } as EntitySchemaColumnOptions,
  animationInDuration:  { type: Number, default: 2000 } as EntitySchemaColumnOptions,
  animationOut:         { type: 'varchar' } as EntitySchemaColumnOptions,
  animationOutDuration: { type: Number, default: 2000 } as EntitySchemaColumnOptions,
  animationText:        { type: 'varchar' } as EntitySchemaColumnOptions,
  animationTextOptions: { type: 'simple-json' } as EntitySchemaColumnOptions,
  imageId:              { type: String } as EntitySchemaColumnOptions,
  imageOptions:         { type: 'simple-json' } as EntitySchemaColumnOptions,
  filter:               { type: 'simple-json', nullable: true } as EntitySchemaColumnOptions,
  soundId:              { type: String } as EntitySchemaColumnOptions,
  soundVolume:          { type: Number } as EntitySchemaColumnOptions,
  alertDurationInMs:    { type: Number } as EntitySchemaColumnOptions,
  alertTextDelayInMs:   { type: Number } as EntitySchemaColumnOptions,
  enableAdvancedMode:   { type: Boolean } as EntitySchemaColumnOptions,
  advancedMode:         { type: 'simple-json' } as EntitySchemaColumnOptions,
  tts:                  { type: 'simple-json' } as EntitySchemaColumnOptions,
  font:                 { type: 'simple-json', nullable: true } as EntitySchemaColumnOptions,
};

export const Alert = new EntitySchema<Readonly<Required<AlertInterface>>>({
  name:    'alert',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    updatedAt: {
      type: 'bigint', transformer: new ColumnNumericTransformer(), default: 0,
    },
    name:                      { type: String },
    alertDelayInMs:            { type: Number },
    profanityFilterType:       { type: String },
    loadStandardProfanityList: { type: 'simple-json' },
    customProfanityList:       { type: 'text' },
    tts:                       { type: 'simple-json', nullable: true },
    font:                      { type: 'simple-json' },
    fontMessage:               { type: 'simple-json' },
  },
  relations: {
    follows: {
      type:        'one-to-many',
      target:      'alert_follow',
      inverseSide: 'alert',
      cascade:     true,
    },
    subs: {
      type:        'one-to-many',
      target:      'alert_sub',
      inverseSide: 'alert',
      cascade:     true,
    },
    subcommunitygifts: {
      type:        'one-to-many',
      target:      'alert_subcommunitygift',
      inverseSide: 'alert',
      cascade:     true,
    },
    subgifts: {
      type:        'one-to-many',
      target:      'alert_subgift',
      inverseSide: 'alert',
      cascade:     true,
    },
    hosts: {
      type:        'one-to-many',
      target:      'alert_host',
      inverseSide: 'alert',
      cascade:     true,
    },
    raids: {
      type:        'one-to-many',
      target:      'alert_raid',
      inverseSide: 'alert',
      cascade:     true,
    },
    tips: {
      type:        'one-to-many',
      target:      'alert_tip',
      inverseSide: 'alert',
      cascade:     true,
    },
    cheers: {
      type:        'one-to-many',
      target:      'alert_cheer',
      inverseSide: 'alert',
      cascade:     true,
    },
    resubs: {
      type:        'one-to-many',
      target:      'alert_resub',
      inverseSide: 'alert',
      cascade:     true,
    },
    cmdredeems: {
      type:        'one-to-many',
      target:      'alert_command_redeem',
      inverseSide: 'alert',
      cascade:     true,
    },
    rewardredeems: {
      type:        'one-to-many',
      target:      'alert_reward_redeem',
      inverseSide: 'alert',
      cascade:     true,
    },
  },
});

export const AlertMedia = new EntitySchema<Readonly<Required<AlertMediaInterface>>>({
  name:    'alert_media',
  columns: {
    primaryId: {
      type: Number, primary: true, generated: true,
    },
    id:      { type: String },
    b64data: { type: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') ? 'longtext' : 'text' },
    chunkNo: { type: Number },
  },
  indices: [
    { name: 'IDX_b0f12c32653ed88fd576d3520c', columns: ['id'] },
  ],
});

export const AlertFollow = new EntitySchema<Readonly<Required<CommonSettingsInterface>>>({
  name:      'alert_follow',
  columns:   { ...CommonSettingsSchema },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'follows',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertSub = new EntitySchema<Readonly<Required<CommonSettingsInterface>>>({
  name:      'alert_sub',
  columns:   { ...CommonSettingsSchema },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'subs',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertSubcommunitygift = new EntitySchema<Readonly<Required<CommonSettingsInterface>>>({
  name:      'alert_subcommunitygift',
  columns:   { ...CommonSettingsSchema },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'subcommunitygifts',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertSubgift = new EntitySchema<Readonly<Required<CommonSettingsInterface>>>({
  name:      'alert_subgift',
  columns:   { ...CommonSettingsSchema },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'subgifts',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertHost = new EntitySchema<Readonly<Required<CommonSettingsInterface>>>({
  name:      'alert_host',
  columns:   { ...CommonSettingsSchema },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'hosts',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertRaid = new EntitySchema<Readonly<Required<CommonSettingsInterface>>>({
  name:      'alert_raid',
  columns:   { ...CommonSettingsSchema },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'raids',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertTip = new EntitySchema<Readonly<Required<AlertTipInterface>>>({
  name:    'alert_tip',
  columns: {
    ...CommonSettingsSchema,
    message: { type: 'simple-json' },
  },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'tips',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertCheer = new EntitySchema<Readonly<Required<AlertTipInterface>>>({
  name:    'alert_cheer',
  columns: {
    ...CommonSettingsSchema,
    message: { type: 'simple-json' },
  },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'cheers',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertResub = new EntitySchema<Readonly<Required<AlertResubInterface>>>({
  name:    'alert_resub',
  columns: {
    ...CommonSettingsSchema,
    message: { type: 'simple-json' },
  },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'resubs',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertCommandRedeem = new EntitySchema<Readonly<Required<CommonSettingsInterface>>>({
  name:      'alert_command_redeem',
  columns:   { ...CommonSettingsSchema },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'command_redeems',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});

export const AlertRewardRedeem = new EntitySchema<Readonly<Required<AlertRewardRedeemInterface>>>({
  name:    'alert_reward_redeem',
  columns: {
    ...CommonSettingsSchema,
    message:  { type: 'simple-json' },
    rewardId: { type: String }, // even when rewardId type can be null, we don't want it to be saved in database
  },
  relations: {
    alert: {
      type:        'many-to-one',
      target:      'alert',
      inverseSide: 'reward_redeems',
      joinColumn:  { name: 'alertId' },
      onDelete:    'CASCADE',
      onUpdate:    'CASCADE',
    },
  },
});