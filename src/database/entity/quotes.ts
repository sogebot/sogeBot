import { IsNotEmpty } from 'class-validator';
import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Quotes extends BaseEntity {
  @PrimaryColumn({ type: 'int', generated: 'increment' })
    id: number;

  @Column({ type: 'simple-array' })
    tags: string[];

  @IsNotEmpty()
  @Column()
    quote: string;

  @Column()
    quotedBy: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length, default: '1970-01-01T00:00:00.000Z' })
    createdAt: string;
}