import { getValueOf } from '~/helpers/customvariables/getValueOf.js';
import { setValueOf } from '~/helpers/customvariables/setValueOf.js';

export const CustomVariableGenerator = (pluginId: string) => ({
  async set(variableName: string, value: any) {
    variableName = String(variableName).trim();
    if (variableName.startsWith('$_')) {
      await setValueOf(variableName, value, {});
    } else {
      throw new Error('Variable name must start with "$_".');
    }
  },
  async get(variableName: string) {
    variableName = String(variableName).trim();
    if (variableName.startsWith('$_')) {
      return getValueOf(String(variableName));
    } else {
      throw new Error('Variable name must start with "$_".');
    }
  },
});