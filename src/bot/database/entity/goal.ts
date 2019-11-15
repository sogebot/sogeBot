import { Column, Entity, Index, JoinColumn, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';


@Entity()
export class GoalGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @OneToMany(() => Goal, (entity) => entity.group, {
    cascade: true,
  })
  goals!: Goal[];

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  createdAt!: number;
  @Column()
  name!: string;
  @Column('simple-json')
  display!: {
    type: 'fade';
    durationMs: number;
    animationInMs: number;
    animationOutMs: number;
  } | {
    type: 'multi';
    spaceBetweenGoalsInPx: number;
  };
}

@Entity()
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => GoalGroup, (entity) => entity.goals, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group!: GoalGroup;
  @Column({ name: 'groupId', nullable: true })
  @Index()
  groupId!: string | null;

  @Column()
  name!: string;
  @Column('varchar', { length: 20 })
  type!: 'followers' | 'currentFollowers' | 'currentSubscribers' | 'subscribers' | 'tips' | 'bits';
  @Column()
  countBitsAsTips!: boolean;
  @Column('varchar', { length: 20 })
  display!: 'simple' | 'full' | 'custom';

  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timestamp!: number;
  @Column('float', { transformer: new ColumnNumericTransformer(), default: 0 })
  goalAmount!: number;
  @Column('float', { transformer: new ColumnNumericTransformer(), default: 0 })
  currentAmount!: number;
  @Column()
  endAfter!: string;
  @Column()
  endAfterIgnore!: boolean;

  @Column('simple-json')
  customizationBar!: {
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderPx: number;
    height: number;
  };
  @Column('simple-json')
  customizationFont!: {
    family: string;
    color: string;
    size: number;
    borderColor: string;
    borderPx: number;
  };
  @Column('text')
  customizationHtml!: string;
  @Column('text')
  customizationJs!: string;
  @Column('text')
  customizationCss!: string;
};