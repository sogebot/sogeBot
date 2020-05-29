<template>
  <div>
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

      <input class="form-control w-100" type="text" placeholder="Type id or username to search through global ignore list" v-model="search"/>
    </div>
    <ul style="font-size: 0.75rem;" class="list-group list-group-horizontal text-left" v-for="(chunkValues, index) of chunk(excludedValues, 2)" :key="'a' + index">
      <button type="button" @click="removeFromExcludeList(key)" class="list-group-item w-50 list-group-item-primary" v-for="key of chunkValues" :key="'b' + key">
      <strong>ID:</strong> {{ key }}<strong><br>Known aliases:</strong> {{ values[key].known_aliases.join(', ') }}<br><strong>Reason:</strong> {{ values[key].reason }}
      </button>
    </ul>
    <ul style="font-size: 0.75rem;" class="list-group list-group-horizontal text-left" v-for="(chunkValues, index) of chunk(Object.keys(computedValues), 2)" :key="'c' + index">
      <button type="button" @click="addToExcludeList(key)" class="list-group-item w-50 list-group-item-dark" v-for="key of chunkValues" :key="'d' + key">
        <strong>ID:</strong> {{ key }}<strong><br>Known aliases:</strong> {{ values[key].known_aliases.join(', ') }}<br><strong>Reason:</strong> {{ values[key].reason }}
      </button>
    </ul>
    <ul class="list-group list-group-horizontal" style="font-size:0.75rem;">
      <li class="list-group-item w-100 text-center list-group-item-info">Use search input, there are <strong style="font-size: 1.25rem">{{Object.keys(values).length}}</strong> globally ignored users.</li>
    </ul>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import { chunk } from 'lodash-es';

import { globalIgnoreList } from 'src/bot/data/globalIgnoreList';

@Component({})
export default class btnEmit extends Vue {
  @Prop() readonly value!: number[];
  @Prop() readonly title!: string;

  values: {
    [x: number]: {
      reason: string; known_aliases: string[];
    }
  } = globalIgnoreList;
  chunk = chunk;

  currentValue = this.value;
  translatedTitle = this.translate(this.title);
  search = '';

  @Watch('currentValue')
  onChange() {
    this.$emit('update', { value: this.currentValue });
  }

  get computedValues(): { [x: number]: { reason: string; known_aliases: string[]; }} {
    if (this.search.trim().length) {
      const keys = Object.keys(this.values).filter(key => {
        return (key.includes(this.search) ||
                this.values[Number(key)].known_aliases.filter(k => k.toLowerCase().includes(this.search.toLowerCase())).length > 0) &&
                !this.excludedIds.includes(key);
      });
      return keys.reduce((prev, key) => {
        return { [Number(key)]: this.values[Number(key)], ...prev };
      }, {})
    } else {
      return [];
    }
  }

  get excludedIds() {
    return Object.keys(this.values).filter(o => this.currentValue.includes(Number(o)));
  }

  get excludedValues(): { [x: number]: { reason: string; known_aliases: string[]; }} {
    return this.excludedIds.reduce((prev, key) => {
      return { [Number(key)]: this.values[Number(key)], ...prev };
    }, {})
  }

  addToExcludeList(key: number) {
    this.currentValue = [...new Set([key, ...this.currentValue])];
  }

  removeFromExcludeList(key: number) {
    this.currentValue = this.currentValue.filter(o => o !== key);
  }
};
</script>