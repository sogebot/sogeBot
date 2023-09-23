import { EntitySchema } from 'typeorm';

export class WidgetCustomInterface {
  id: string;
  userId: string;
  url: string;
  name: string;
}

export const WidgetCustom = new EntitySchema<Readonly<Required<WidgetCustomInterface>>>({
  name:    'widget_custom',
  columns: {
    id: {
      type:    String,
      primary: true,
    },
    userId: { type: String },
    url:    { type: String },
    name:   { type: String },
  },
});
