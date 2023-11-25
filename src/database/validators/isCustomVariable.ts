import { registerDecorator, ValidationOptions } from 'class-validator';
import { z } from 'zod';

export function IsCustomVariable(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name:         'IsCustomVariable',
      target:       object.constructor,
      propertyName: propertyName,
      options:      validationOptions,
      validator:    {
        validate(value: any) {
          return typeof value === 'string'
            && value.length > 2 && value.startsWith('$_');
        },
      },
    });
  };
}

export function customvariable() {
  return z.custom(value => typeof value === 'string'
  && value.length > 2 && value.startsWith('$_'), 'isCustomVariable');
}