import { EntitySchema } from 'typeorm';

export interface PriceInterface {
  id?: string;
  command: string;
  enabled?: boolean;
  price: number;
}

export const Price = new EntitySchema<Readonly<Required<PriceInterface>>>({
  name: 'price',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    command: { type: String },
    enabled: { type: Boolean, default: true },
    price: { type: Number },
  },
  indices: [
    { name: 'IDX_d12db23d28020784096bcb41a3', unique: true, columns: ['command'] },
  ],
});