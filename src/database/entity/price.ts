import { IsNotEmpty, IsPositive, MinLength, ValidateIf } from 'class-validator';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { IsCommand } from '../validators/IsCommand.js';

@Entity()
export class Price extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @IsCommand()
  @Index('IDX_d12db23d28020784096bcb41a3', { unique: true })
    command: string;

  @Column({ default: true })
    enabled: boolean;

  @Column({ default: false })
    emitRedeemEvent: boolean;

  @Column()
  @IsPositive()
  @ValidateIf(o => o.priceBits <= 0)
    price: number;

  @Column({ default: 0 })
  @ValidateIf(o => o.price <= 0)
  @IsPositive()
    priceBits: number;
}