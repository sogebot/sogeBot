import { validateOrReject } from 'class-validator';
import { BaseEntity } from 'typeorm';
import { z } from 'zod';

export class BotEntity extends BaseEntity {
  static create<T extends BaseEntity>(
    this: { new (): T } & typeof BaseEntity,
    entityOrEntities?: any,
  ) {
    if (typeof window === 'undefined') {
      return this.getRepository<T>().create(entityOrEntities);
    } else {
      return entityOrEntities;
    }
  }

  validateAndSave(schema: z.AnyZodObject) {
    return new Promise<this>((resolve, reject) => {
      try {
        schema.parse(this);
        this.save()
          .then(resolve)
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }
  validate() {
    return validateOrReject(this);
  }
}