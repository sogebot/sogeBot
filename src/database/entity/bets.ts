import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { BotEntity } from '~/database/BotEntity';

@Entity()
export class Bets extends BotEntity<Bets> {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column({ nullable: false, type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    createdAt?: string;

  @BeforeInsert()
  generateCreatedAt() {
    this.createdAt = new Date().toISOString();
    if (!this.participants) {
      this.participants = [];
    }
  }

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    endedAt?: string;

  @Column({ default: false })
    isLocked?: boolean;

  @Column({ default: false })
    arePointsGiven?: boolean;

  @Column({ type: 'simple-array' })
    options: string[];

  @Column()
    title: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    participants: {
    userId: string;
    username: string;
    points: number;
    optionIdx: number;
  }[] = [];
}