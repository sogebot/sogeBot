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
      <li class="list-group-item border-0 d-flex" v-for='(v, index) of currentValues' :key="index">
        <div class="w-100" :key="index">
          <input type="text" class="form-control" v-model="v.url" readonly="true"/>
        </div>
        <button class="btn" :class="{ 'btn-success': v.clip, 'btn-danger': !v.clip }" @click="v.clip = !v.clip; onChange();">CLIP</button>
        <button class="btn" :class="{ 'btn-success': v.highlight, 'btn-danger': !v.highlight }" @click="v.highlight = !v.highlight; onChange();">HIGHLIGHT</button>

        <button class="btn btn-outline-dark border-0" @click="removeItem(index); onChange()"><fa icon="times"></fa></button>
      </li>
      <li class="list-group-item">
        <button class="btn btn-success" type="button" @click="currentValues.push({
          url: origin + '/highlights/' + uuid(),
          clip: false,
          highlight: false,
        }); onChange();">
          <fa icon="plus"></fa> Generate new url
        </button>
      </li>
    </ul>
  </div>
</template>


<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

@Component({})
export default class configurableList extends Vue {
  @Prop() readonly values: any;
  @Prop() readonly title!: string;

  currentValues = this.values;
  translatedTitle = this.translate(this.title);

  get origin() {
    return window.location.origin;
  }

  @Watch('currentValue')
  onChange() {
    this.$emit('update', this.currentValues);
  }

  removeItem(index: number) {
    this.currentValues.splice(index, 1);
  }

  uuid() {
    var dec2hex: any[] = [];
    for (var i=0; i<=15; i++) {
      dec2hex[i] = i.toString(16);
    }

    var uuid = '';
    for (var i=1; i<=36; i++) {
      if (i===9 || i===14 || i===19 || i===24) {
        uuid += '-';
      } else if (i===15) {
        uuid += 4;
      } else if (i===20) {
        uuid += dec2hex[(Math.random()*4|0 + 8)];
      } else {
        uuid += dec2hex[(Math.random()*16|0)];
      }
    }
    return uuid;
  }
}
</script>