import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Alias {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Index()
  alias!: string;
  @Column()
  @Index()
  command!: string;
  @Column()
  enabled!: boolean;
  @Column()
  visible!: boolean;
  @Column()
  permission!: string;
};