import { EntitySchema } from 'typeorm';

export interface CarouselInterface {
  id?: string;
  order: number;
  type: string;
  waitBefore: number;
  waitAfter: number;
  duration: number;
  animationInDuration: number;
  animationIn: string;
  animationOutDuration: number;
  animationOut: string;
  showOnlyOncePerStream: boolean;
  base64: string;
}

export const Carousel = new EntitySchema<Readonly<Required<CarouselInterface>>>({
  name:    'carousel',
  columns: {
    id: {
      type: String, primary: true, generated: 'uuid',
    },
    order:                 { type: Number },
    type:                  { type: String },
    waitAfter:             { type: Number },
    waitBefore:            { type: Number },
    duration:              { type: Number },
    animationIn:           { type: String },
    animationInDuration:   { type: Number },
    animationOut:          { type: String },
    animationOutDuration:  { type: Number },
    showOnlyOncePerStream: { type: Boolean },
    base64:                { type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'longtext' : 'text' },
  },
});