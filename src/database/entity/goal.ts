import { IsNotEmpty, MinLength } from 'class-validator';
import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';

import { BotEntity } from '../BotEntity';

@Entity()
export class Goal extends BotEntity<Goal> {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column({ nullable: false, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    createdAt?: string;

  @Column()
  @MinLength(2)
  @IsNotEmpty()
    name: string;

  @Column({ type: 'json' })
    display: {
    type: 'fade';
    durationMs: number;
    animationInMs: number;
    animationOutMs: number;
  } | {
    type: 'multi';
    spaceBetweenGoalsInPx: number;
  };

  @Column({ type: 'json' })
    campaigns: {
    name: string;
    type:
    'followers' | 'currentFollowers' | 'currentSubscribers'
    | 'subscribers' | 'tips' | 'bits' | 'intervalSubscribers'
    | 'intervalFollowers' | 'intervalTips' | 'intervalBits' | 'tiltifyCampaign';
    countBitsAsTips: boolean;
    display: 'simple' | 'full' | 'custom';
    timestamp?: string;
    tiltifyCampaign?: number | null,
    interval?: 'hour' | 'day' | 'week' | 'month' | 'year';
    goalAmount?: number;
    currentAmount?: number;
    endAfter: string;
    endAfterIgnore: boolean;
    customizationBar: {
      color: string;
      backgroundColor: string;
      borderColor: string;
      borderPx: number;
      height: number;
    };
    customizationFont: {
      family: string;
      color: string;
      size: number;
      weight: number;
      borderColor: string;
      borderPx: number;
      shadow: {
        shiftRight: number;
        shiftDown: number;
        blur: number;
        opacity: number;
        color: string;
      }[];
    };
    customizationHtml: string;
    customizationJs: string;
    customizationCss: string;
  }[];

  @BeforeInsert()
  beforeInsert() {
    this.createdAt = new Date().toISOString();
    this.campaigns ??= [];
  }
}