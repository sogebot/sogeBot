import { get } from 'lodash';

import { parserReply } from '../commons';
import { prepare } from '../helpers/commons';
import { getValueOf, setValueOf } from '../helpers/customvariables';

import type { ResponseFilter } from '.';

const custom: ResponseFilter = {
  '$_#': async (variable, attr) => {
    if (typeof attr.param !== 'undefined' && attr.param.length !== 0) {
      const state = await setValueOf(variable, attr.param, { sender: { ...attr.sender, source: typeof attr.discord === 'undefined' ? 'twitch' : 'discord' } });
      if (state.updated.responseType === 0) {
        // default
        if (state.isOk && !state.isEval) {
          const msg = prepare('filters.setVariable', { value: state.setValue, variable: variable });
          parserReply(msg, { sender: attr.sender, discord: attr.discord, attr: { skip: true, quiet: get(attr, 'quiet', false) } });
        }
        return state.updated.currentValue;
      } else if (state.updated.responseType === 1) {
        // custom
        if (state.updated.responseText) {
          parserReply(state.updated.responseText.replace('$value', state.setValue), { sender: attr.sender,  discord: attr.discord, attr: { skip: true, quiet: get(attr, 'quiet', false) } });
        }
        return '';
      } else {
        // command
        return state.isOk && !state.isEval ? state.setValue : state.updated.currentValue;
      }
    }
    return getValueOf(variable, { sender: { ...attr.sender, source: typeof attr.discord === 'undefined' ? 'twitch' : 'discord' } });
  },
  // force quiet variable set
  '$!_#': async (variable, attr) => {
    variable = variable.replace('$!_', '$_');
    if (typeof attr.param !== 'undefined' && attr.param.length !== 0) {
      const state = await setValueOf(variable, attr.param, { sender: { ...attr.sender, source: typeof attr.discord === 'undefined' ? 'twitch' : 'discord' } });
      return state.updated.currentValue;
    }
    return getValueOf(variable, { sender: { ...attr.sender, source: typeof attr.discord === 'undefined' ? 'twitch' : 'discord' } });
  },
  // force full quiet variable
  '$!!_#': async (variable, attr) => {
    variable = variable.replace('$!!_', '$_');
    if (typeof attr.param !== 'undefined' && attr.param.length !== 0) {
      await setValueOf(variable, attr.param, { sender: { ...attr.sender, source: typeof attr.discord === 'undefined' ? 'twitch' : 'discord' } });
    }
    return '';
  },
};

export { custom };