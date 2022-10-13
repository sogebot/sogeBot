import { IsNotEmpty, Min, MinLength } from 'class-validator';
import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';
import { BotEntity } from '~/database/entity/_botEntity';

@Entity()
@Unique('IDX_93c78c94804a13befdace81904', ['type', 'value'])
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