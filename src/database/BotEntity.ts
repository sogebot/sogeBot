import { validateOrReject } from 'class-validator';
import { BaseEntity } from 'typeorm';

export class BotEntity extends BaseEntity {
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