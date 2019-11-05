import { Column, Entity, Index, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Cooldown {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Index({ unique: true })
  name!: string;
  @Column()
  miliseconds!: number;
  @Column('varchar', { length: 10 })
  type!: 'global' | 'user';
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timestamp!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  lastTimestamp!: number;
  @Column()
  isErrorMsgQuiet!: boolean;
  @Column()
  isEnabled!: boolean;
  @Column()
  isOwnerAffected!: boolean;
  @Column()
  isModeratorAffected!: boolean;
  @Column()
  isSusbcriberAffected!: boolean;
  @Column()
  isFollowerAffected!: boolean;
  @OneToMany(() => CooldownViewer, (v) => v.cooldown, {
    cascade: true,
  })
  viewers!: CooldownViewer[];
};

@Entity()
export class CooldownViewer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Cooldown, (c) => c.viewers, {
    onDelete: 'CASCADE',
  })
  cooldown!: Cooldown;
  @Column()
  username!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  timestamp!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  lastTimestamp!: number;
};