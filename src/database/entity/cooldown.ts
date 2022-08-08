import { IsNotEmpty, MinLength } from 'class-validator';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class Cooldown extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @Index('IDX_aa85aa267ec6eaddf7f93e3665', { unique: true })
    name: string;

  @Column()
    miliseconds: number;

  @Column({ type: 'varchar', length: 10 })
    type: 'global' | 'user';

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    timestamp: string;

  @Column()
    isEnabled: boolean;

  @Column()
    isErrorMsgQuiet: boolean;

  @Column()
    isOwnerAffected: boolean;

  @Column()
    isModeratorAffected: boolean;

  @Column()
    isSubscriberAffected: boolean;
}