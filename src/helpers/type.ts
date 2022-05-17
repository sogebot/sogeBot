// https://stackoverflow.com/questions/61323821/alternative-to-math-max-and-math-min-for-bigint-type-in-javascript

export const bigIntMax = (...args: bigint[]): bigint => args.reduce((m, e) => e > m ? e : m);
export const bigIntMin = (...args: bigint[]): bigint => args.reduce((m, e) => e < m ? e : m);

// https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
// Courtesy of https://stackoverflow.com/users/696535/pawel
// https://stackoverflow.com/a/56150320

export const serialize = (toSerialize: bigint | Map<any, any>): string => {
  return JSON.stringify(toSerialize, function (key, value) {
    const originalObject = this[key];
    if(originalObject instanceof Map) {
      return {
        dataType: 'Map',
        value:    Array.from(originalObject.entries()), // or with spread: value: [...originalObject]
      };
    } if (typeof originalObject === 'bigint') {
      return {
        dataType: 'BigInt',
        value:    String(value), // or with spread: value: [...originalObject]
      };
    } else {
      return value;
    }
  });
};

export function unserialize<K>(serializedMap: string | undefined): K | undefined {
  if (!serializedMap) {
    return undefined;
  }
  return JSON.parse(serializedMap, function (key, value) {
    if(typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }
      if (value.dataType === 'BigInt') {
        return BigInt(value.value);
      }
    }
    return value;
  });
}