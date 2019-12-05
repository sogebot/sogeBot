import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Randomizer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @OneToMany(() => RandomizerItem, (entity) => entity.randomizer, {
    cascade: true,
  })
  items!: RandomizerItem[];

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  createdAt!: number;
  @Column()
  command!: string;
  @Column()
  permissionId!: string;
  @Column()
  name!: string;
  @Column('boolean', { default: false })
  isShown!: boolean;
  @Column('varchar', { length: 20, default: 'simple' })
  type!: 'simple' | 'wheelOfFortune';
  @Column('simple-json')
  customizationFont!: {
    family: string;
    size: number;
    color: string;
    borderColor: string;
    borderPx: number;
  };
}

@Entity()
export class RandomizerItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Randomizer, (entity) => entity.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'randomizerId' })
  randomizer!: Randomizer;
  @Column({ name: 'randomizerId', nullable: true })
  @Index()
  randomizerId!: string | null;

  /*
   * This should hlp with grouping things like Bancrupcy, WIN, Bancrupcy, to always appear beside
   */
  @Column('varchar', { nullable: true })
  groupId!: string | null; // Will be used to group items together
  @Column('int', { default: 0 })
  groupOrder!: number; // order in group

  @Column()
  name!: string;
  @Column('varchar', { length: '9', nullable: true }) // length 9: #123456aa (if we support alpha in future)
  color!: string;

  @Column('int', { default: 1 })
  numOfDuplicates!: number; // number of duplicates
  @Column('int', { default: 1 })
  minimalSpacing!: number; // minimal space between duplicates

}