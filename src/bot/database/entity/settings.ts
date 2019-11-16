import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  namespace!: string;

  @Column()
  @Index()
  name!: string;

  @Column('text')
  value!: string;
}