import { EntitySchema } from 'typeorm';

export interface PriceInterface {
  id?: string;
  command: string;
  enabled?: boolean;
  price: number;
  priceBits: number;
  emitRedeemEvent: boolean;
}

export const Price = new EntitySchema<Readonly<Required<PriceInterface>>>({
  name:    'price',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    command:         { type: String },
    enabled:         { type: Boolean, default: true },
    price:           { type: Number },
    priceBits:       { type: Number, default: 0 },
    emitRedeemEvent: { type: Boolean, default: false },
  },
  indices: [
    {
      name: 'IDX_d12db23d28020784096bcb41a3', unique: true, columns: ['command'],
    },
  ],
});