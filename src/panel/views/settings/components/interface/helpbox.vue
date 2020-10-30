<template>
  <b-alert show v-html="translatedTitle" :variant="fullObject.variant || 'info'"></b-alert>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import translate from 'src/panel/helpers/translate';

@Component({})
export default class helpbox extends Vue {
  @Prop() readonly title!: string;
  @Prop() readonly fullObject: any;
  translatedTitle = translate(this.title);
}
</script>