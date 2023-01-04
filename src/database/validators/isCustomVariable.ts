import { registerDecorator, ValidationOptions } from 'class-validator';

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