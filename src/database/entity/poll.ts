import { ArrayMinSize, IsNotEmpty, MinLength } from 'class-validator';
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

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

  @CreateDateColumn()
    openedAt: Date;

  @Column({ nullable: true, type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'timestamp' : 'datetime' })
    closedAt: Date | null;

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
    return this.findOne({ where: { closedAt: null } });
  }
}
