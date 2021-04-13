<template>
  <b-alert
    show
    :variant="fullObject.variant || 'info'"
    v-html="translatedTitle"
  />
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  Component, Prop, Vue,
} from 'vue-property-decorator';

@Component({})
export default class helpbox extends Vue {
  @Prop() readonly title!: string;
  @Prop() readonly fullObject: any;
  translatedTitle = translate(this.title);
}
</script>