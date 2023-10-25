import { PluginVariable } from '~/database/entity/plugins.js';

export const VariableGenerator = (pluginId: string) => ({
  async loadFromDatabase(variableName: string) {
    const variable = await PluginVariable.findOneBy({ pluginId, variableName });
    if (variable) {
      return JSON.parse(variable.value);
    }
    return null;
  },
  async saveToDatabase(variableName: string, value: any) {
    const variable = new PluginVariable();
    variable.variableName = variableName;
    variable.pluginId = pluginId;
    variable.value = JSON.stringify(value);
    await variable.save();
  },
});