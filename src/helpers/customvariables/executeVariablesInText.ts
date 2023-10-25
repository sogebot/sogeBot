import { getValueOf } from './getValueOf.js';
import { isVariableSet } from './isVariableSet.js';

const customVariableRegex = new RegExp('\\$_[a-zA-Z0-9_]+', 'g');

async function executeVariablesInText(text: string, attr: { sender: { userId: string; username: string; source: 'twitch' | 'discord' }} | null): Promise<string> {
  for (const variable of text.match(customVariableRegex)?.sort((a, b) => b.length - a.length) || []) {
    const isVariable = await isVariableSet(variable);
    let value = '';
    if (isVariable) {
      value = await getValueOf(variable, attr) || '';
    }
    text = text.replace(new RegExp(`\\${variable}`, 'g'), value);
  }
  return text;
}

export { executeVariablesInText };