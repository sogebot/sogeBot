import { AfterInsert, AfterUpdate, Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  @Index()
  userId!: string;

  @Column()
  isOnline!: boolean;
  @Column()
  isFollower!: boolean;
  @Column()
  isModerator!: boolean;
  @Column()
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
  points!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  pointsOnlineGivenAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  pointsOfflineGivenAt!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  pointsByMessageGivenAt!: number;

  @OneToMany(() => UserTip, (tip) => tip.user, {
    cascade: true,
  })
  tips!: UserTip[];

  @OneToMany(() => UserBit, (bit) => bit.user, {
    cascade: true,
  })
  bits!: UserBit[];

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  messages!: number;
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

  @AfterInsert()
  @AfterUpdate()
  async recountBitsAmount() {
    console.log('TODO: recount tips');
    console.log(this);
  }
}