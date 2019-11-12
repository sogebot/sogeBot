import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Duel {
  @PrimaryColumn()
  id!: number;
  @Column()
  username!: string;
  @Column()
  tickets!: number;
}