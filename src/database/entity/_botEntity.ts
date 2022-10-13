import { validateOrReject } from 'class-validator';
import { BaseEntity } from 'typeorm';

export class BotEntity extends BaseEntity {
  constructor(initialValues?: Partial<BotEntity>) {
    super();
    if (initialValues) {
      BotEntity.merge(this, initialValues);
    }
  }

  validateAndSave() {
    return new Promise((resolve, reject) => {
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