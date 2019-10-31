import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  namespace!: string;

  @Column()
  key!: string;

  @Column()
  value!: string;
}