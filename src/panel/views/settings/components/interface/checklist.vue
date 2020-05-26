<template>
  <div class="d-flex">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else>
          {{ translatedTitle.title }}
          <small class="text-info" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <ul class="list-group list-group-flush w-100 border border-input">
      <li class="list-group-item border-0" :key="index" v-for='(v, index) of value' :class="[current.includes(v) ? 'list-group-item-success' : 'list-group-item-danger']">{{ v }}</li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component({})
export default class btnEmit extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly current: any;
  @Prop() readonly title!: string;

  currentValue = this.value;
  translatedTitle = this.translate(this.title);
};
</script>
