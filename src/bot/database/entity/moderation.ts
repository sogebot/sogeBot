import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class ModerationWarning {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  @Index()
  username!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timestamp!: number;
};

@Entity()
export class ModerationPermit {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  @Index()
  username!: string;
};

@Entity()
export class ModerationMessageCooldown {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column()
  @Index({ unique: true })
  name!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timestamp!: number;
};