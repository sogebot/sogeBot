import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Carousel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  order!: number;
  @Column()
  type!: string;

  @Column()
  waitBefore!: number;
  @Column()
  waitAfter!: number;
  @Column()
  duration!: number;

  @Column()
  animationInDuration!: number;
  @Column()
  animationIn!: string;
  @Column()
  animationOutDuration!: number;
  @Column()
  animationOut!: string;

  @Column()
  showOnlyOncePerStream!: boolean;

  @Column('text')
  base64!: string;
}