export const toBoolean = (value: string | boolean | number): boolean => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  } else if (typeof value === 'number') {
    return Boolean(value);
  } else {
    return value;
  }
};
