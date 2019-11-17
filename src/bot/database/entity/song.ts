import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class SongPlaylist {
  @PrimaryColumn()
  videoId!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  lastPlayedAt!: number;
  @Column('float')
  seed!: number;
  @Column()
  title!: string;
  @Column('float')
  loudness!: number;
  @Column()
  length!: number;
  @Column({ default: false })
  forceVolume!: boolean;
  @Column()
  volume!: number;
  @Column()
  startTime!: number;
  @Column()
  endTime!: number;
};

@Entity()
export class SongRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  videoId!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  addedAt!: number;
  @Column()
  title!: string;
  @Column('float')
  loudness!: number;
  @Column()
  length!: number;
  @Column()
  username!: string;
};

@Entity()
export class SongBan {
  @PrimaryColumn()
  videoId!: string;
  @Column()
  title!: string;
};