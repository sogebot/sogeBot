<template>
  <b-alert show v-html="translatedTitle" :variant="fullObject.variant || 'info'"></b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class helpbox extends Vue {
  @Prop() readonly title: any;
  @Prop() readonly fullObject: any;
  translatedTitle = this.translate(this.title);
}
</script>