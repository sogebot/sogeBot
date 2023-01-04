import { validateOrReject } from 'class-validator';
import { BaseEntity } from 'typeorm';

export class BotEntity<P> extends BaseEntity {
  constructor(initialValues?: Partial<P>) {
    super();
    if (initialValues) {
      for (const key of Object.keys(initialValues)) {
        this[key as keyof this] = initialValues[key as keyof P] as any;
      }
    }
  }

  validateAndSave() {
    return new Promise<this>((resolve, reject) => {
      validateOrReject(this)
        .then(() => {
          this.save()
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
  }
  validate() {
    return validateOrReject(this);
  }
}