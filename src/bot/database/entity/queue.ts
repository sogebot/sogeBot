import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Queue {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  createdAt!: number;
  @Column()
  @Index({ unique: true })
  username!: string;
  @Column()
  isModerator!: boolean;
  @Column()
  isSubscriber!: boolean;
  @Column()
  isFollower!: boolean;
};

