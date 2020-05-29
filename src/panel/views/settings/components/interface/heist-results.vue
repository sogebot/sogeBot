<template>
  <div class="mt-3">
    <div v-if="w_results.length === 0" class="alert alert-info">
      {{ translate('games.heist.noResultsFound') }}
    </div>
    <div class="row" :class="{'mt-3' : index > 0}" :key="index" v-for="(result, index) of w_results">
      <div class="col-11">
        <div class="input-group">
          <span class="input-group-text">{{translate('games.heist.message')}}</span>
          <input type="text" v-model="result.message" class='form-control' @keydown="update" @change="update">
        </div>
        <div class="input-group mt-1">
          <span class="input-group-text">{{translate('games.heist.percentage')}}</span>
          <input type="number" min="1" v-model="result.percentage" class='form-control' @keydown="update" @change="update">
        </div>
      </div>

      <div class="col-1 pl-0">
        <button class="btn btn-danger h-100 w-100" @click="removeResult(index)"><fa icon="trash-alt"></fa></button>
      </div>
    </div>
    <button class="btn btn-success btn-block mt-2" @click="addResult"><fa icon="plus"></fa></button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import type { Result } from 'src/bot/games/heist';

@Component({})
export default class heistResults extends Vue {
  @Prop() readonly value!: Result[];

  w_results = this.value.sort((a, b) => {
    return a.percentage - b.percentage;
  })

  @Watch('w_results')
  update() {
    this.$emit('update', { value: this.w_results });
  }

  addResult() {
    this.w_results.push({
      percentage: 10,
      message: ''
    });
  }

  removeResult(index: number) {
    this.w_results.splice(index, 1);
  }
}
</script>