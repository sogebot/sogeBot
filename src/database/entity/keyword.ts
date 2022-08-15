import { IsNotEmpty, MinLength } from 'class-validator';
import { ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class Keyword extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @Index('IDX_35e3ff88225eef1d85c951e229')
    keyword: string;

  @Column()
    enabled: boolean;

  @Column({ nullable: true, type: String })
    group: string | null;

  @OneToMany(() => KeywordResponses, (item) => item.keyword)
    responses: KeywordResponses[];
}

@Entity()
export class KeywordResponses extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
    order: number;

  @Column({ type: 'text' })
    response: string;

  @Column()
    stopIfExecuted: boolean;

  @Column({ nullable: true, type: String })
    permission: string | null;

  @Column()
    filter: string;

  @ManyToOne(() => Keyword, (item) => item.responses, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    keyword: Keyword;
}

@Entity()
export class KeywordGroup extends BaseEntity {
  @PrimaryColumn()
  @Index('IDX_keyword_group_unique_name', { unique: true })
    name: string;

  @Column({ type: 'simple-json' })
    options: {
    filter: string | null;
    permission: string | null;
  };
}