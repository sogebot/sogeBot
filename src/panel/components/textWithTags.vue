<template>
  <div style="flex: 1 1 auto;" v-html="filter(value)"></div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { sortBy, keys, isNil } from 'lodash-es';

import { flatten } from 'src/bot/helpers/flatten';
import translate from '../helpers/translate';

export interface Global {
  translations: any;
}

@Component({})
export default class textWithTags extends Vue {
  @Prop() value !: string;

  filter(val: string) {
    const filtersRegExp = new RegExp('\\$(' + sortBy(keys(flatten(translate('responses.variable', true))), (o) => -o.length).join('|') + ')', 'g');
    val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let matches = val.match(filtersRegExp);
    let output = val;
    if (!isNil(matches)) {
      for (let match of matches) {
        output = output.replace(match,
          `<span contenteditable="false" class="editable-variable">
            ${this.translate('responses.variable.' + match.replace('$', ''))}
          </span>&nbsp;`);
      }
    }
    return output;
  }
}
</script>