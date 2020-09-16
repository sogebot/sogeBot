<template>
  <div style="flex: 1 1 auto;" v-html="filter(value)"></div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api'
import { sortBy, keys, isNil } from 'lodash-es';

import { flatten } from 'src/bot/helpers/flatten';
import translate from '../helpers/translate';

interface Props {
  value: string;
}

export default defineComponent({
  props: {
    value: String,
  },
  setup(props: Props, context) {
    const filter = (val: string) => {
      const filtersRegExp = new RegExp('\\$(' + sortBy(keys(flatten(translate('responses.variable', true))), (o) => -o.length).join('|') + ')', 'g');
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let matches = val.match(filtersRegExp);
      let output = val;
      if (!isNil(matches)) {
        for (let match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`);
        }
      }
      return output;
    }
    return { filter }
  }
});
</script>