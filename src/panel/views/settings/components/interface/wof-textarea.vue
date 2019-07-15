<template>
  <div style="flex: 1 1 auto; height: fit-content">
    <textarea v-on:blur="editation = false" v-show="editation" ref="textarea" v-model="currentValue" v-bind:placeholder="placeholder" class="form-control" v-bind:style="heightStyle"></textarea>
    <div class="form-control" ref="div" style="cursor: text; overflow: auto; resize: vertical;"
      v-show="!editation"
      v-on:click="editation=true"
      v-bind:style="heightStyle"
      v-html="valueWithHTML">
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import _ from 'lodash';

export interface Global {
  translations: any;
}
declare var global: Global;

@Component({})
export default class wofTextarea extends Vue {
  @Prop() readonly value: any;
  @Prop() readonly placeholder: any;
  @Prop() readonly rid: any;
  @Prop() readonly oid: any;

  currentValue = this.value;
  height: number = 0;
  editation: boolean = false;

  get valueWithHTML() {
    if (this.currentValue.trim().length === 0) {
      return `<span class="text-muted">${this.placeholder}</span>`;
    } else {
      const filtersRegExp = new RegExp('\\$(' + _.sortBy(_.keys(global.translations.responses.variable), (o) => -o.length).join('|') + ')', 'g');
      let matches = this.currentValue.match(filtersRegExp);
      let output = this.currentValue;
      if (!_.isNil(matches)) {
        for (let match of matches) {
          output = output.replace(match,
            `<span contenteditable="false" class="editable-variable">
              ${this.translate('responses.variable.' + match.replace('$', ''))}
            </span>&nbsp;`);
        }
      }
      return output;
    }
  }

  get heightStyle() {
    if (this.height === 0) {return 'height: auto';};
    return `height: ${this.height + 2}px`;
  }

  @Watch('currentValue')
  onCurrentValueChange(val) {
    const data = { option: this.oid, response: this.rid, value: val };
    console.debug('[WOF] Updating response', data);
    this.$emit('update', { oid: this.oid, rid: this.rid, value: val });
  }

  @Watch('editation')
  onEditationChange(val, old) {
    if (val) {
      // focus textarea and set height
      this.height = (this.$refs.div as HTMLElement).clientHeight;
      Vue.nextTick(() => {
        (this.$refs.textarea as HTMLElement).focus();
      });
    } else {
      // texteare unfocused, set height of div
      this.height = (this.$refs.textarea as HTMLElement).clientHeight;
    }
  }
}
</script>