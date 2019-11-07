import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  @Index()
  userId!: string;
  @Column()
  @Index()
  username!: string;
  @Column({ default: '' })
  displayname!: string;
  @Column({ default: '' })
  profileImageUrl!: string;

  @Column({ default: false })
  isOnline!: boolean;
  @Column({ default: false })
  isVIP!: boolean;
  @Column({ default: false })
  isFollower!: boolean;
  @Column({ default: false })
  isModerator!: boolean;
  @Column({ default: false })
  isSubscriber!: boolean;

  @Column({ default: '' })
  rank!: string;
  @Column({ default: false})
  haveCustomRank!: boolean;

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  followedAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  followCheckAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  subscribedAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  seenAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  createdAt!: number;

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  watchedTime!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  chatTimeOnline!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  chatTimeOffline!: number;

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  points!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  pointsOnlineGivenAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  pointsOfflineGivenAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  pointsByMessageGivenAt!: number;

  @Column({ default: '0' })
  subscribeTier!: string;
  @Column({ default: 0 })
  subscribeCumulativeMonths!: number;
  @Column({ default: 0 })
  subscribeStreak!: number;

  @OneToMany(() => UserTip, (tip) => tip.user, {
    cascade: true, eager: true,
  })
  tips!: UserTip[];

  @OneToMany(() => UserBit, (bit) => bit.user, {
    cascade: true, eager: true,
  })
  bits!: UserBit[];

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  messages!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  giftedSubscribes!: number;
};

@Entity()
export class UserTip {
  @PrimaryGeneratedColumn()
  id!: string;

  @ManyToOne(() => User, (user) => user.tips, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column()
  amount!: number;
  @Column()
  currency!: string;
  @Column({ default: '' })
  message!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  tippedAt!: number;

  @Column()
  sortAmount!: number;
}

@Entity()
export class UserBit {
  @PrimaryGeneratedColumn()
  id!: string;

  @ManyToOne(() => User, (user) => user.bits, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column()
  amount!: number;
  @Column({ default: '' })
  message!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  cheeredAt!: number;
}