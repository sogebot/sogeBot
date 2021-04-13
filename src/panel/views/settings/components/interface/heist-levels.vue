<template>
  <div>
    <div
      v-if="w_levels.length === 0"
      class="alert alert-info"
    >
      {{ translate('games.heist.noLevelsFound') }}
    </div>
    <div
      v-for="(level, index) of w_levels"
      :key="index"
      class="row"
      :class="{'mt-3' : index > 0}"
    >
      <div class="col-11">
        <div class="input-group">
          <span class="input-group-text">{{ translate('games.heist.name') }}</span>
          <input
            v-model="level.name"
            type="text"
            class="form-control"
            @keydown="update"
            @change="update"
          >
        </div>
        <div class="input-group mt-1">
          <span class="input-group-text">{{ translate('games.heist.winPercentage') }}</span>
          <input
            v-model="level.winPercentage"
            type="number"
            min="1"
            class="form-control"
            @keydown="update"
            @change="update"
          >
        </div>
        <div class="input-group mt-1">
          <span class="input-group-text">{{ translate('games.heist.payoutMultiplier') }}</span>
          <input
            v-model="level.payoutMultiplier"
            type="number"
            min="1"
            step="0.1"
            class="form-control"
            @keydown="update"
            @change="update"
          >
        </div>
        <div class="input-group mt-1">
          <span class="input-group-text">{{ translate('games.heist.maxUsers') }}</span>
          <input
            v-model="level.maxUsers"
            type="number"
            min="1"
            class="form-control"
            @keydown="update"
            @change="update"
          >
        </div>
      </div>

      <div class="col-1 pl-0">
        <button
          class="btn btn-danger h-100 w-100"
          @click="removeLevel(index)"
        >
          <fa icon="trash-alt" />
        </button>
      </div>
    </div>
    <button
      class="btn btn-success btn-block mt-2"
      @click="addLevel"
    >
      <fa icon="plus" />
    </button>
  </div>
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import {
  Component, Prop, Vue, Watch,
} from 'vue-property-decorator';

import type { Level } from 'src/bot/games/heist';

@Component({})
export default class heistLevels extends Vue {
  translate = translate;

  @Prop() readonly value!: Level[];

  w_levels = this.value.sort((a, b) => {
    return a.maxUsers - b.maxUsers;
  });

  @Watch('w_levels')
  update() {
    this.$emit('update', { value: this.w_levels });
  }

  addLevel() {
    this.w_levels.push({
      name:             '',
      winPercentage:    10,
      payoutMultiplier: 1,
      maxUsers:         10,
    });
  }

  removeLevel(index: number) {
    this.w_levels.splice(index, 1);
  }
}
</script>