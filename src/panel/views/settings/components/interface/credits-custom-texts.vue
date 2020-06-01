<template>
  <div>
    <div class="input-group pt-1 pb-1" v-for="(v, index) of orderBy(currentValues, 'order')" :key="index">
      <div class="input-group-prepend d-flex" style="flex: 0 1 auto; flex-direction: column;">
        <button class="btn btn-block btn-secondary m-0 h-100" type="button" v-if="index !== 0" @click="moveUp(index)">
          <fa icon="sort-up"></fa>
        </button>
        <button class="btn btn-block btn-secondary m-0 h-100" type="button" v-if="index != currentValues.length - 1"  @click="moveDn(index)">
          <fa icon="sort-down"></fa>
        </button>
      </div>
      <select v-model="v.type" class="form-control" style="height: auto !important;">
        <option v-for="(o, index2) of options" :value="o.value" :key="index2">{{o.text}}</option>
      </select>
      <textarea class="form-control" v-model="v.left" style="resize: none;" :readonly="['separator', 'bigHeader'].includes(v.type)"></textarea>
      <textarea class="form-control" v-model="v.middle" style="resize: none;" :readonly="['separator'].includes(v.type)"></textarea>
      <textarea class="form-control" v-model="v.right" style="resize: none;" :readonly="['separator', 'bigHeader'].includes(v.type)"></textarea>
      <div class="input-group-append">
        <button class="btn btn-danger" type="button" @click="remove(index); reorder()">
          <fa :icon="['far', 'trash-alt']"></fa>
        </button>
      </div>
    </div>
    <button class="btn btn-success btn-block" @click="currentValues.push({ order: currentValues.length, type: 'bigHeader', text: { left: '', middle: '', right: '' } })">
      <fa icon="plus"></fa>
    </button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import { orderBy } from 'lodash-es';

@Component({})
export default class configurableList extends Vue {
  @Prop() readonly value!: {
    order: number; left: string; middle: string; right: string;
  }[];

  orderBy = orderBy;

  currentValues = this.value;
  options: { value: string, text: string }[] = [
    { value: 'bigHeader', text: 'Big Header' },
    { value: 'header', text: 'Header' },
    { value: 'text', text: 'Text' },
    { value: 'smallText', text: 'Small Text' },
    { value: 'separator', text: 'Separator' }
  ];

  @Watch('currentValues')
  onChange() {
    this.$emit('update', { value: this.currentValues })
  }

  moveUp(order: number) {
    const val = Object.assign({}, this.currentValues.find(o => o.order === order))
    const val2 = Object.assign({}, this.currentValues.find(o => o.order === order - 1))

    const findVal = this.currentValues.find(o => o.order === order)
    const findVal2 = this.currentValues.find(o => o.order === order - 1);
    if (findVal && findVal2) {
      findVal.order = val2.order
      findVal2.order = val.order
    }
    this.onChange()
  }

  moveDn(order: number) {
    const val = Object.assign({}, this.currentValues.find(o => o.order === order))
    const val2 = Object.assign({}, this.currentValues.find(o => o.order === order + 1))

    const findVal = this.currentValues.find(o => o.order === order)
    const findVal2 = this.currentValues.find(o => o.order === order + 1);
    if (findVal && findVal2) {
      findVal.order = val2.order
      findVal2.order = val.order
    }
    this.onChange()
  }

  remove(order: number) {
    this.currentValues = this.currentValues.filter(o => o.order !== order)
  }

  reorder() {
    let val: any[] = []
    for (let i = 0, length = this.currentValues.length; i < length; i++) {
      val[i] = this.currentValues[i]
      val[i].order = i
    }
    this.currentValues = val
    this.onChange()
  }
}
</script>
