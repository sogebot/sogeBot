import { ArrayMinSize, IsNotEmpty, MinLength } from 'class-validator';
import { BaseEntity, Column, Entity, IsNull, PrimaryColumn } from 'typeorm';

@Entity()
export class Poll extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column({ type: 'varchar', length: 7 })
    type: 'tips' | 'bits' | 'normal' | 'numbers' = 'normal';

  @Column()
  @MinLength(2)
  @IsNotEmpty()
    title: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    openedAt: string;

  @Column({ nullable: true, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    closedAt: string | null;

  @ArrayMinSize(2)
  @Column({ type: 'simple-array' })
    options: string[];

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    votes: {
    option: number;
    votes: number;
    votedBy: string;
  }[] = [];

  static findOpened() {
    return this.findOne({ where: { closedAt: IsNull() } });
  }
}
