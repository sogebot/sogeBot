import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Socket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: number;
  @Column('varchar', { length: 10 })
  type!: 'admin' | 'viewer' | 'public';

  @Column('varchar', { nullable: true, length: 36 })
  accessToken!: string | null;
  @Column('varchar', { nullable: true, length: 36 })
  refreshToken!: string;

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  accessTokenTimestamp!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  refreshTokenTimestamp!: number;
};