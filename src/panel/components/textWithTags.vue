<template>
  <div
    style="flex: 1 1 auto;"
    v-html="filter(value)"
  />
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import { defineComponent } from '@vue/composition-api';
import {
  isNil, keys, sortBy,
} from 'lodash-es';

import { flatten } from 'src/bot/helpers/flatten';

interface Props {
  value: string;
}

export default defineComponent({
  props: { value: String },
  setup(props: Props, context) {
    const filter = (val: string) => {
      const filtersRegExp = new RegExp('\\$(' + sortBy(keys(flatten(translate('responses.variable', true))), (o) => -o.length).join('|') + ')', 'g');
      val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const matches = val.match(filtersRegExp);
      let output = val;
      if (!isNil(matches)) {
        for (const match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`);
        }
      }
      return output;
    };
    return { filter };
  },
});
</script>