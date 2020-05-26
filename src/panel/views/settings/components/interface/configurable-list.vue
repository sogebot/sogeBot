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
        <li class="list-group-item border-0 d-flex" v-for='(v, index) of currentValue' :key="index">
          <div class="w-100" :key="index">
            <input type="text" class="form-control" v-model="currentValue[index]"/>
          </div>
          <button class="btn btn-outline-dark border-0" @click="removeItem(index)"><fa icon="times"></fa></button>
        </li>
        <li class="list-group-item">
          <button class="btn btn-success" type="button" @click="currentValue.push('')">
            <fa icon="plus"></fa> Add new item
          </button>
        </li>
      </ul>
    </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

@Component({})
export default class configurableList extends Vue {
  @Prop() readonly current: any;
  @Prop() readonly value: any;
  @Prop() readonly title!: string;

  show: boolean = true;
  currentValue = this.value;
  translatedTitle = this.translate(this.title);

  @Watch('currentValue')
  onChange() {
    this.$emit('update', { value: this.currentValue });
  }

  removeItem(index: number) {
    this.currentValue.splice(index, 1);
  }
}
</script>