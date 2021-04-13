<template>
  <button
    ref="button"
    :disabled="state !== 0 || !emit"
    :class="this.state === 2 ? 'btn-danger' : ''"
    @click="emitToBackend"
  >
    <fa
      v-if="state === 1"
      icon="circle-notch"
      spin
    />
    <fa
      v-if="state === 2"
      icon="exclamation"
    />
    {{ translate(this.title) }}
  </button>
</template>

<script lang="ts">

import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  Component, Prop, Vue,
} from 'vue-property-decorator';

@Component({})
export default class btnEmit extends Vue {
  @Prop() readonly emit: any;
  @Prop() readonly title!: string;

  translate = translate;

  state = 0;

  emitToBackend() {
    this.state = 1;
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit(this.emit, (err: string | null, data: { do: 'redirect' | 'refresh', opts: string[] }) => {
        if (err) {
          this.state = 2;
          this.$emit('error', err);
          setTimeout(() => {
            this.state = 0;
          }, 2000);
        } else {
          if (data) {
            // to do eval data
            if (data.do === 'redirect') {
              window.location.assign(data.opts[0]);
            } else if (data.do === 'refresh') {
              window.location.reload();
            }
          }
          this.state = 0;
        }
      });
  }
}
</script>
