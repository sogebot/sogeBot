import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Quotes {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('simple-array')
  tags!: string[];

  @Column()
  quote!: string;

  @Column()
  quotedBy!: string;

  @Column()
  createdAt!: number;
};