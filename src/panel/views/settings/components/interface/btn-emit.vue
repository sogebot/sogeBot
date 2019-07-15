<template>
  <button class="btn" @click="emitToBackend">
    {{translate(this.title)}}
  </button>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class btnEmit extends Vue {
  @Prop() readonly emit: any;
  @Prop() readonly title: any;

  emitToBackend() {
    io(`/${this.$route.params.type}/${this.$route.params.id}`, { query: "token=" + this.token })
      .emit(this.emit)
  }
};
</script>
