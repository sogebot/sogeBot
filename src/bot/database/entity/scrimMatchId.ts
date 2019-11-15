import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ScrimMatchId {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  @Index({ unique: true })
  username!: string;
  @Column()
  matchId!: string;
};
