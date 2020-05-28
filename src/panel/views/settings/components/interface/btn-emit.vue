<template>
<button ref="button" @click="emitToBackend" :disabled="state !== 0 || !emit" :class="this.state === 2 ? 'btn-danger' : ''">
    <fa v-if="state === 1" icon="circle-notch" spin/>
    <fa v-if="state === 2" icon="exclamation"/>
    {{translate(this.title)}}
  </button>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

@Component({})
export default class btnEmit extends Vue {
  @Prop() readonly emit: any;
  @Prop() readonly title: any;

  state: number = 0

  emitToBackend() {
    this.state = 1;
    getSocket(`/${this.$route.params.type}/${this.$route.params.id}`)
      .emit(this.emit, (err, data) => {
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
              window.location = data.opts[0];
            } else if (data.do === 'refresh') {
              window.location.reload();
            }
          }
          this.state = 0;
        }
      });
  }
};
</script>
