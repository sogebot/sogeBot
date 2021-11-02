import { Events } from '@entity/event';

import twitch from '../services/twitch';
import { flatten } from './flatten';

const attributesReplace = (attributes: Events.Attributes, replaceIn: string) => {
  const atUsername = twitch.showWithAt;
  const flattenAttributes = flatten(attributes);

  for (const key of Object.keys(flattenAttributes).sort((a, b) => b.length - a.length)) {
    let val = flattenAttributes[key];
    if (typeof val === 'object' && Object.keys(val).length === 0) {
      continue;
    } // skip empty object
    if (key.includes('userName') || key.includes('recipient')) {
      val = atUsername ? `@${val}` : val;
    }
    const replace = new RegExp(`\\$${key}`, 'gi');
    replaceIn = replaceIn.replace(replace, val);
  }
  return replaceIn;
};

export { attributesReplace };