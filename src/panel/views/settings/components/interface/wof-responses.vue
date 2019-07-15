<template>
  <div>
    <div v-if="w_options.length === 0" class="alert alert-info">
      {{ translate('games.wheeloffortune.noOptionsFound') }}
    </div>
    <template v-for="(option, index) of w_options">
      <div :key="index + option.title" class="input-group" style="height: fit-content" v-bind:class="{ 'pt-4': index > 0 }">
        <div class="input-group-prepend">
          <span class="input-group-text">{{ translate('games.wheeloffortune.title.name') }}</span>
        </div>
        <input class="form-control"
          v-bind:placeholder="translate('games.wheeloffortune.title.placeholder')"
          v-model="option.title"
          v-on:input="updateOption(index, option.title)">
        <button v-on:click="removeOption(index)" class="btn btn-danger btn-sm"><i class="fas fa-minus"></i> {{ translate('games.wheeloffortune.remove.option') }}</button>
      </div>
      <div :key="index + option.title" class="d-flex" style="height: fit-content">
        <div class="input-group-prepend">
          <span class="input-group-text d-block text-left">
            <div>{{ translate('games.wheeloffortune.responses.name') }}</div>
            <small>{{ translate('games.wheeloffortune.responses.help') }}</small>
          </span>
        </div>
        <div class="d-block w-100 p-0 border-0" style="height: fit-content">
          <template v-if="option.responses.length > 1">
            <div class="d-flex" v-for="(response, index2) of option.responses" :key="response + index2">
              <textarea-with-tags
                v-bind:placeholder="translate('games.wheeloffortune.responses.placeholder')"
                v-bind:value="response"
                v-bind:rid="index2"
                v-bind:oid="index"
                v-on:update="updateResponse"></textarea-with-tags>
              <div class="input-group-append">
                <button v-on:click="removeResponse(index, index2)" class="btn btn-danger btn-sm"><i class="fas fa-minus"></i> {{ translate('games.wheeloffortune.remove.response') }}</button>
              </div>
            </div>
          </template>
          <template v-if="option.responses.length <= 1">
              <textarea-with-tags
                v-bind:placeholder="translate('games.wheeloffortune.responses.placeholder')"
                v-bind:value="option.responses[0]"
                rid="0"
                v-bind:oid="index"
                v-on:update="updateResponse"></textarea-with-tags>
          </template>
          <button v-on:click="addResponse(index)" class="btn btn-success btn-block btn-sm"><i class="fas fa-plus"></i></button>
        </div>
      </div>
    </template>
    <button v-on:click="addOption" class="btn btn-success btn-block mt-3"><i class="fas fa-plus"></i> {{ translate('games.wheeloffortune.addOption') }}</button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

@Component({
  components: {
    'textarea-with-tags': () => import('./wof-textarea.vue')
  }
})
export default class wofResponses extends Vue {
  @Prop() readonly value: any;

  w_options = this.value;

  @Watch("w_options")
  onChange() {
    this.$emit('update', { value: this.w_options });
  }
  updateOption(index, value) {
    let option = this.w_options[index];
    option.title = value;
    Vue.set(this.w_options, index, option);
  }
  addOption() {
    this.w_options.push({ title: '', responses: [''] });
  }
  removeOption(index) {
    this.w_options.splice(index, 1);
  }
  addResponse(oid) {
    this.w_options[oid].responses.push('');
  }
  updateResponse(opts) {
    let option = this.w_options[opts.oid];
    option.responses[opts.rid] = opts.value;
    Vue.set(this.w_options, opts.oid, option);
  }
  removeResponse(oid, rid) {
    let option = this.w_options[oid];
    option.responses.splice(rid, 1);
    Vue.set(this.w_options, oid, option);
  }
}
</script>