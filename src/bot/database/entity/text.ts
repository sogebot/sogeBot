import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Text {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  name!: string;
  @Column('text')
  text!: string;
  @Column('text')
  css!: string;
  @Column('text')
  js!: string;
  @Column('simple-array')
  external!: string[];
};