import { at, isNil } from 'lodash-es';

export let translations = {};

function castObject (key: string, value: string | { [x: string]: any }) {
  if (typeof value === 'string') {
    return { [key]: value };
  } else {
    return value;
  }
}

export default function(key: string, asObject?: false): string;
export default function(key: string, asObject: true): { [x: string]: any };
export default function(key: string, asObject = false): string | { [x: string]: any } {
  return isNil(at(translations, key)[0])
    ? `{${key}}`
    : asObject
      ? castObject(key, at(translations, key)[0] as string | { [x: string]: any })
      : at(translations, key)[0] as string | { [x: string]: any };
}

export const setTranslations = (_translations: any) => {
  translations = _translations;
};