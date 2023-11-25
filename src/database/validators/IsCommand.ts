import { registerDecorator, ValidationOptions } from 'class-validator';
import { z } from 'zod';

export function IsCommand(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name:         'isCommand',
      target:       object.constructor,
      propertyName: propertyName,
      options:      validationOptions,
      validator:    {
        validate(value: any) {
          return typeof value === 'string'
            && value.startsWith('!');
        },
      },
    });
  };
}

export function command() {
  return z.custom(value => typeof value === 'string' && value.trim().length > 1 && value.startsWith('!'), 'isCommand');
}