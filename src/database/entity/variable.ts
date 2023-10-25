import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';

import { BotEntity } from '../BotEntity.js';
import { IsNotEmpty, IsNumber, MinLength } from 'class-validator';
import defaultPermissions from '../../helpers/permissions/defaultPermissions.js';
import { IsCustomVariable } from '../validators/isCustomVariable.js';

@Entity()
export class VariableWatch extends BotEntity {
  @PrimaryColumn({
    type:      Number,
    primary:   true,
    generated: 'increment',
  })
    id: string;
  @Column({
    type: String, nullable: false, name: 'variableId',
  })
    variableId: string;
  @Column()
    order: number;
}

@Entity()
export class Variable extends BotEntity {
  @BeforeInsert()
  generateCreatedAt() {
    if (!this.runAt) {
      this.runAt = new Date(0).toISOString();
    }
    if (!this.urls) {
      this.urls = [];
    }
    if (!this.history) {
      this.history = [];
    }
    if (!this.permission) {
      this.permission = defaultPermissions.MODERATORS;
    }
  }

  @PrimaryColumn({
    type:      'uuid',
    primary:   true,
    generated: 'uuid',
  })
    id: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    history: {
    userId: string;
    username: string;
    currentValue: string;
    oldValue: string;
    changedAt: string;
  }[];

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    urls: {
    id: string;
    GET: boolean;
    POST: boolean;
    showResponse: boolean;
  }[];

  @Column({ unique: true })
  @MinLength(3)
  @IsCustomVariable()
    variableName: string;

  @Column({ default: '' })
    description: string;

  @Column({ type: String })
    type: 'eval' | 'number' | 'options' | 'text';

  @Column({
    type:     String,
    nullable: true,
  })
    currentValue: string;

  @Column({ type: 'text' })
    evalValue: string;

  @Column({ default: 60000 })
  @IsNotEmpty()
  @IsNumber()
    runEvery: number;

  @Column()
    responseType: number;

  @Column({ default: '' })
    responseText: string;

  @Column()
    permission: string;

  @Column({
    type:    Boolean,
    default: false,
  })
    readOnly: boolean;

  @Column({ type: 'simple-array' })
    usableOptions: string[];

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    runAt: string;
}