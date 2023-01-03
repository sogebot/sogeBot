import { Column, Entity, PrimaryColumn } from 'typeorm';

import { BotEntity } from '../BotEntity';
import { IsNotEmpty, IsNumber, MinLength } from 'class-validator';
import { defaultPermissions } from '~/helpers/permissions';

@Entity()
export class VariableWatch extends BotEntity<VariableWatch> {
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
export class Variable extends BotEntity<Variable> {
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
  }[] = [];

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    urls: {
    id: string;
    GET: boolean;
    POST: boolean;
    showResponse: boolean;
  }[];

  @Column({ unique: true })
  @IsNotEmpty()
  @MinLength(3)
    variableName: string;

  @Column({ default: '' })
    description: string = '';

  @Column({ type: String })
    type: 'eval' | 'number' | 'options' | 'text' = 'text';

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
    runEveryTypeValue: number = 60000;

  @Column({ type: String, default: 'isUsed' })
    runEveryType: 'isUsed' | string = 'isUsed';

  @Column({ default: 60000 })
  @IsNotEmpty()
  @IsNumber()
    runEvery: number = 60000;

  @Column()
    responseType: number = 0;

  @Column({ default: '' })
    responseText: string = '';

  @Column()
    permission: string = defaultPermissions.MODERATORS;

  @Column({
    type:    Boolean,
    default: false,
  })
    readOnly: boolean = false;

  @Column({ type: 'simple-array' })
    usableOptions: string[] = [];

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    runAt: string = new Date(0).toISOString();
}