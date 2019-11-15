import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Gallery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  type!: string;
  @Column('text')
  data!: string;
  @Column()
  name!: string;
}