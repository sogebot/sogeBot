import { registerDecorator, ValidationOptions } from 'class-validator';
import { BaseEntity } from 'typeorm';

export function IsCommandOrCustomVariable(validationOptions?: ValidationOptions) {
  return function (object: BaseEntity, propertyName: string) {
    registerDecorator({
      name:         'IsCommandOrCustomVariable',
      target:       object.constructor,
      propertyName: propertyName,
      options:      validationOptions,
      validator:    {
        validate(value: any) {
          return typeof value === 'string'
            && (value.startsWith('!') || (value.length > 2 && value.startsWith('$_')));
        },
      },
    });
  };
}