import { Events } from '../database/entity/event';
import tmi from '../tmi';
import { flatten } from './flatten';

const attributesReplace = (attributes: Events.Attributes, replaceIn: string) => {
  const atUsername = tmi.showWithAt;
  const flattenAttributes = flatten(attributes);

  for (const key of Object.keys(flattenAttributes).sort((a, b) => b.length - a.length)) {
    let val = flattenAttributes[key];
    if (typeof val === 'object' && Object.keys(val).length === 0) {
      continue;
    } // skip empty object
    if (key.includes('username') || key.includes('recipient')) {
      val = atUsername ? `@${val}` : val;
    }
    const replace = new RegExp(`\\$${key}`, 'g');
    replaceIn = replaceIn.replace(replace, val);
  }
  return replaceIn;
};

export { attributesReplace };