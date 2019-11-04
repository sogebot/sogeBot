import { Column, Entity, Index, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Cooldown {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Index({ unique: true })
  key!: string;
  @Column()
  miliseconds!: number;
  @Column('varchar', { length: 10 })
  type!: 'global' | 'user';
  @Column('bigint', { default: 0 })
  timestamp!: number;
  @Column('bigint', { default: 0 })
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
  @Column('bigint')
  timestamp!: number;
  @Column('bigint')
  lastTimestamp!: number;
};