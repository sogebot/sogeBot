<template>
  <div>
    <div class="input-group pt-1 pb-1" v-for="(v, index) of orderBy(currentValues, 'order')" :key="index">
      <select v-model="v.type" class="form-control" style="height: auto !important;">
        <option v-for="(o, index2) of socials" :value="o.value" :key="index2">{{o.text}}</option>
      </select>
      <textarea class="form-control" v-model="v.text" style="resize: none;"></textarea>
      <div class="input-group-append">
        <button class="btn btn-danger" type="button" @click="remove(index); reorder()">
          <fa :icon="['far', 'trash-alt']"></fa>
        </button>
      </div>
    </div>
    <button class="btn btn-success btn-block" @click="currentValues.push({ order: currentValues.length, type: 'facebook', text: '' })">
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
    order: number; text: string;
  }[];

  orderBy = orderBy;

  currentValues = this.value;
  socials: { value: string, text: string }[] = [
    { value: 'deviantart', text: 'DeviantArt' },
    { value: 'discord', text: 'Discord' },
    { value: 'facebook', text: 'Facebook' },
    { value: 'github', text: 'GitHub' },
    { value: 'google', text: 'Google' },
    { value: 'instagram', text: 'Instagram' },
    { value: 'linkedin', text: 'LinkedIn' },
    { value: 'paypal', text: 'PayPal' },
    { value: 'pinterest', text: 'Pinterest' },
    { value: 'playstation', text: 'Playstation' },
    { value: 'reddit', text: 'Reddit' },
    { value: 'skype', text: 'Skype' },
    { value: 'snapchat', text: 'Snapchat' },
    { value: 'spotify', text: 'Spotify' },
    { value: 'steam', text: 'Steam' },
    { value: 'strava', text: 'Strava' },
    { value: 'telegram', text: 'Telegram' },
    { value: 'twitter', text: 'Twitter' },
    { value: 'vk', text: 'VK' },
    { value: 'windows', text: 'Windows' },
    { value: 'xbox', text: 'XBox' },
    { value: 'youtube', text: 'YouTube' }
  ];

  @Watch('currentValues')
  onChange() {
    this.$emit('update', { value: this.currentValues })
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
