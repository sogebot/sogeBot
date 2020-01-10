require('module-alias/register');
import * as configFile from '@ormconfig';

import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export abstract class EmitData {
  name!: string;
  amount!: number;
  currency!: string;
  monthsName!: string;
  event!: keyof Omit<Alert, 'id' | 'updatedAt' | 'name' |'alertDelayInMs' | 'profanityFilterType' | 'loadStandardProfanityList' | 'customProfanityList'>;
  message!: string;
  autohost!: boolean;
}

export abstract class CommonSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'alertId', nullable: true })
  alertId?: string;

  @Column()
  enabled!: boolean;
  @Column()
  title!: string;
  @Column()
  variantCondition!: 'random' | 'exact' | 'gt-eq';
  @Column()
  variantAmount!: number;
  @Column()
  messageTemplate!: string;
  @Column()
  layout!: '1' | '2' | '3' | '4' | '5';
  @Column()
  animationIn!: 'fadeIn' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
  | 'fadeInUp' | 'fadeInDownBig' | 'fadeInLeftBig' | 'fadeInRightBig'
  | 'fadeInUpBig' | 'bounceIn' | 'bounceInDown' | 'bounceInLeft'
  | 'bounceInRight' | 'bounceInUp' | 'flipInX' | 'flipInY' | 'lightSpeedIn'
  | 'rotateIn' | 'rotateInDownLeft' | 'rotateInDownRight' | 'rotateInUpLeft'
  | 'rotateInUpRight' | 'slideInDown' | 'slideInLeft' | 'slideInRight'
  | 'slideInUp' | 'zoomIn' | 'zoomInDown' | 'zoomInLeft' | 'zoomInRight'
  | 'zoomInUp' | 'rollIn' | 'jackInTheBox';
  @Column()
  animationOut!: 'fadeOut' | 'fadeOutDown' | 'fadeOutLeft' | 'fadeOutRight' | 'fadeOutUp'
  | 'fadeOutDownBig' | 'fadeOutLeftBig' | 'fadeOutRightBig' | 'fadeOutUpBig'
  | 'bounceOut' | 'bounceOutDown' | 'bounceOutLeft' | 'bounceOutRight'
  | 'bounceOutUp' | 'flipOutX' | 'flipOutY' | 'lightSpeedOut' | 'rotateOut'
  | 'rotateOutDownLeft' | 'rotateOutDownRight' | 'rotateOutUpLeft'
  | 'rotateOutUpRight' | 'slideOutDown' | 'slideOutLeft' | 'slideOutRight'
  | 'slideOutUp' | 'zoomOut' | 'zoomOutDown' | 'zoomOutLeft' | 'zoomOutRight'
  | 'zoomOutUp' | 'rollOut';
  @Column()
  animationText!: 'none' | 'baffle' | 'bounce' | 'bounce2' | 'flip' | 'flash' | 'pulse2' | 'rubberBand'
  | 'shake2' | 'swing' | 'tada' | 'wave' | 'wobble' | 'wiggle' | 'wiggle2' | 'jello';
  @Column('simple-json')
  animationTextOptions!: {
    speed: number | 'slower' | 'slow' | 'fast' | 'faster';
    maxTimeToDecrypt: number;
    characters: string;
  };
  @Column()
  imageId!: string;
  @Column()
  soundId!: string;
  @Column()
  soundVolume!: number;
  @Column()
  alertDurationInMs!: number;
  @Column()
  alertTextDelayInMs!: number;
  @Column()
  enableAdvancedMode!: boolean;
  @Column('simple-json')
  advancedMode!: {
    html: null | string;
    css: string;
    js: null | string;
  };
  @Column('simple-json')
  tts!: {
    enabled: boolean;
    skipUrls: boolean;
    keepAlertShown: boolean;
    voice: string;
    pitch: number;
    volume: number;
    rate: number;
  };
  @Column('simple-json')
  font!: {
    family: string;
    size: number;
    borderPx: number;
    borderColor: string;
    weight: number;
    color: string;
    highlightcolor: string;
  };
}

@Entity()
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  updatedAt!: number;
  @Column()
  name!: string;
  @Column()
  alertDelayInMs!: number;
  @Column()
  profanityFilterType!: 'disabled' | 'replace-with-asterisk' | 'replace-with-happy-words' | 'hide-messages' | 'disable-alerts';
  @Column('simple-json')
  loadStandardProfanityList!: {
    cs: boolean;
    en: boolean;
    ru: boolean;
  };
  @Column('text')
  customProfanityList!: string;

  @OneToMany(() => AlertFollow, (v) => v.alert, {
    cascade: true,
  })
  follows!: AlertFollow[];

  @OneToMany(() => AlertSub, (v) => v.alert, {
    cascade: true,
  })
  subs!: AlertSub[];

  @OneToMany(() => AlertSubgift, (v) => v.alert, {
    cascade: true,
  })
  subgifts!: AlertSubgift[];

  @OneToMany(() => AlertHost, (v) => v.alert, {
    cascade: true,
  })
  hosts!: AlertHost[];

  @OneToMany(() => AlertRaid, (v) => v.alert, {
    cascade: true,
  })
  raids!: AlertRaid[];

  @OneToMany(() => AlertTip, (v) => v.alert, {
    cascade: true,
  })
  tips!: AlertTip[];

  @OneToMany(() => AlertCheer, (v) => v.alert, {
    cascade: true,
  })
  cheers!: AlertCheer[];

  @OneToMany(() => AlertResub, (v) => v.alert, {
    cascade: true,
  })
  resubs!: AlertResub[];
}

@Entity()
export class AlertMedia {
  @PrimaryGeneratedColumn()
  primaryId!: number;

  @Column()
  @Index()
  id!: string;

  @Column(configFile.type === 'mysql' ? 'longtext' : 'text')
  b64data!: string;
  @Column()
  chunkNo!: number;
}

@Entity()
export class AlertFollow extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.follows, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;
}

@Entity()
export class AlertSub extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.subs, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;
}

@Entity()
export class AlertSubgift extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.subgifts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;
}

@Entity()
export class AlertHost extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.hosts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;

  @Column()
  showAutoHost!: boolean;
}

@Entity()
export class AlertRaid extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.raids, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;

  @Column()
  showAutoHost!: boolean;
}

@Entity()
export class AlertTip extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.tips, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;

  @Column('simple-json')
  message!: {
    minAmountToShow: number;
    allowEmotes: {
      twitch: boolean;
      ffz: boolean;
      bttv: boolean;
    };
    font: {
      family: string;
      size: number;
      borderPx: number;
      borderColor: string;
      weight: number;
      color: string;
    };
  };
}

@Entity()
export class AlertCheer extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.cheers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;

  @Column('simple-json')
  message!: {
    minAmountToShow: number;
    allowEmotes: {
      twitch: boolean;
      ffz: boolean;
      bttv: boolean;
    };
    font: {
      family: string;
      size: number;
      borderPx: number;
      borderColor: string;
      weight: number;
      color: string;
    };
  };
}

@Entity()
export class AlertResub extends CommonSettings {
  @ManyToOne(() => Alert, (c) => c.resubs, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert?: Alert;

  @Column('simple-json')
  message!: {
    allowEmotes: {
      twitch: boolean;
      ffz: boolean;
      bttv: boolean;
    };
    font: {
      family: string;
      size: number;
      borderPx: number;
      borderColor: string;
      weight: number;
      color: string;
    };
  };
}