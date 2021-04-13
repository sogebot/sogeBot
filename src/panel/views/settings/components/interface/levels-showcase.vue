<template>
  <div class="input-group">
    <b-row class="w-100">
      <b-col>
        <b-table-simple small>
          <b-tr
            v-for="(xp, idx) in data"
            v-show="idx > 0 && idx < 8"
            :key="'Level '+ idx + ': ' + xp"
          >
            <b-td style="vertical-align: middle">
              {{ idx }}
            </b-td>
            <b-td style="vertical-align: middle">
              {{ xp }}
            </b-td>
          </b-tr>
        </b-table-simple>
      </b-col>
      <b-col>
        <b-table-simple small>
          <b-tr
            v-for="(xp, idx) in data"
            v-show="idx >= 8 && idx < 15"
            :key="'Level '+ idx + ': ' + xp"
          >
            <b-td style="vertical-align: middle">
              {{ idx }}
            </b-td>
            <b-td style="vertical-align: middle">
              {{ xp }}
            </b-td>
          </b-tr>
        </b-table-simple>
      </b-col>
      <b-col>
        <b-table-simple small>
          <b-tr
            v-for="(xp, idx) in data"
            v-show="idx >= 15"
            :key="'Level '+ idx + ': ' + xp"
          >
            <b-td style="vertical-align: middle">
              {{ idx }}
            </b-td>
            <b-td style="vertical-align: middle">
              {{ xp }}
            </b-td>
          </b-tr>
        </b-table-simple>
      </b-col>
    </b-row>
  </div>
</template>

<script lang="ts">

import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, onMounted, ref,
} from '@vue/composition-api';

export default defineComponent({
  props: {
    emit:  String,
    title: String,
    value: String,
  },
  setup(props: { value: string; emit: string; title: string }, ctx) {
    const data = ref([] as string[]);
    const translatedTitle = ref(translate(props.title));

    onMounted(() => {
      getSocket(`/${ctx.root.$route.params.type}/${ctx.root.$route.params.id}`)
        .emit(props.emit, (err: string | null, _data: string[]) => {
          if (err) {
            console.error(err);
          } else {
            data.value = _data;
          }
        });
    });

    return {
      data, translatedTitle, translate,
    };
  },
});
</script>
