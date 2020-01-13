<template>
  <b-alert show v-html="translatedTitle"></b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class helpbox extends Vue {
  @Prop() readonly title: any;
  translatedTitle = this.translate(this.title);
}
</script>

