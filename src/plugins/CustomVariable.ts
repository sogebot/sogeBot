import { getValueOf } from '~/helpers/customvariables/getValueOf';
import { setValueOf } from '~/helpers/customvariables/setValueOf';

export const CustomVariableGenerator = (pluginId: string) => ({
  async set(variableName: string, value: any) {
    await setValueOf(String(variableName), value, {});
  },
  async get(variableName: string) {
    return getValueOf(String(variableName));
  },
});