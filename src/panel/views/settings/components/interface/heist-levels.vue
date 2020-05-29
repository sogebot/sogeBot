<template>
  <div>
    <div v-if="w_levels.length === 0" class="alert alert-info">
      {{ translate('games.heist.noLevelsFound') }}
    </div>
    <div class="row" :class="{'mt-3' : index > 0}" v-for="(level, index) of w_levels" :key="index">
      <div class="col-11">
        <div class="input-group">
          <span class="input-group-text">{{translate('games.heist.name')}}</span>
          <input type="text" v-model="level.name" class='form-control' @keydown="update" @change="update">
        </div>
        <div class="input-group mt-1">
          <span class="input-group-text">{{translate('games.heist.winPercentage')}}</span>
          <input type="number" min="1" v-model="level.winPercentage" class='form-control' @keydown="update"
            @change="update">
        </div>
        <div class="input-group mt-1">
          <span class="input-group-text">{{translate('games.heist.payoutMultiplier')}}</span>
          <input type="number" min="1" step="0.1" v-model="level.payoutMultiplier" class='form-control'
            @keydown="update" @change="update">
        </div>
        <div class="input-group mt-1">
          <span class="input-group-text">{{translate('games.heist.maxUsers')}}</span>
          <input type="number" min="1" v-model="level.maxUsers" class='form-control' @keydown="update" @change="update">
        </div>
      </div>

      <div class="col-1 pl-0">
        <button class="btn btn-danger h-100 w-100" @click="removeLevel(index)"><fa icon="trash-alt"></fa></button>
      </div>
    </div>
    <button class="btn btn-success btn-block mt-2" @click="addLevel"><fa icon="plus"></fa></button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import type { Level } from 'src/bot/games/heist';

@Component({})
export default class heistLevels extends Vue {
  @Prop() readonly value!: Level[];

  w_levels = this.value.sort((a, b) => {
    return a.maxUsers - b.maxUsers;
  })

  @Watch('w_levels')
  update() {
    this.$emit('update', { value: this.w_levels });
  }

  addLevel() {
    this.w_levels.push({
      name: '',
      winPercentage: 10,
      payoutMultiplier: 1,
      maxUsers: 10
    });
  }

  removeLevel(index: number) {
    this.w_levels.splice(index, 1);
  }
}
</script>