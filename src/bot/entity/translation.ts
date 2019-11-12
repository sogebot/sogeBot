import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Translation {
  @Column()
  value!: string;
  @PrimaryColumn()
  name!: string;
}