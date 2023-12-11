import { cloneDeep } from 'lodash-es';
import { BaseEntity } from 'typeorm';
import { z } from 'zod';

export class BotEntity extends BaseEntity {
  schema: z.AnyZodObject | z.ZodEffects<any> | z.ZodIntersection<any, any> | null = null;

  static create<T extends BotEntity>(
    this: { new (): T } & typeof BotEntity,
    entityOrEntities?: any,
  ): T {
    if (typeof (window as any) === 'undefined') {
      if (Array.isArray(entityOrEntities)) {
        throw new Error('Create from array is not supported');
      }
      return this.getRepository<T>().create(entityOrEntities) as unknown as T;
    } else {
      if (entityOrEntities) {
        if (Array.isArray(entityOrEntities)) {
          throw new Error('Create from array is not supported in the browser');
        } else {
          return cloneDeep(entityOrEntities) as T;
        }
      } else {
        throw new Error('entityOrEntities is undefined');
      }
    }
  }

  save() {
    return new Promise<this>((resolve, reject) => {
      try {
        if (this.schema) {
          this.schema.parse(this);
        }
        super.save()
          .then(resolve)
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }
  validate(schema: z.AnyZodObject) {
  }
}