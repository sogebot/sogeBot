import { IsNotEmpty, Min, MinLength } from 'class-validator';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BotEntity } from '../BotEntity.js';

@Entity()
@Index('IDX_93c78c94804a13befdace81904', ['type', 'value'], { unique: true })
export class Rank extends BotEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
  @Min(0)
    value: number;

  @Column()
  @MinLength(2)
  @IsNotEmpty()
    rank: string;

  @Column()
    type: 'viewer' | 'subscriber';
}