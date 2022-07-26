import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsCommandOrCustomVariable(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
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