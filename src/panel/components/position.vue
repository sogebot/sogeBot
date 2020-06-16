<template>
  <b-card no-body>
    <b-card-header header-tag="header" class="p-1" role="tab">
      <b-button block v-b-toggle.accordion-position variant="light" class="text-left">{{translate('dialog.position.settings')}}</b-button>
    </b-card-header>
    <b-collapse id="accordion-position" accordion="accordion-position" role="tabpanel">
      <b-card-body>
        <b-form-group>
          <label for="type_selector"> {{ translate('dialog.position.anchorX') }}</label>
          <b-form-select v-model="pos.anchorX" id="anchorX_selector">
            <option value="left" key="left"> {{translate('dialog.position.left') }}</option>
            <option value="middle" key="middle"> {{translate('dialog.position.middle') }}</option>
            <option value="right" key="right"> {{translate('dialog.position.right') }}</option>
          </b-form-select>
        </b-form-group>

        <b-form-group>
          <label for="type_selector"> {{ translate('dialog.position.anchorY') }}</label>
          <b-form-select v-model="pos.anchorY" id="anchorY_selector">
            <option value="top" key="top"> {{translate('dialog.position.top') }}</option>
            <option value="middle" key="middle"> {{translate('dialog.position.middle') }}</option>
            <option value="bottom" key="bottom"> {{translate('dialog.position.bottom') }}</option>
          </b-form-select>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('dialog.position.x')"
                label-for="font.size">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="position.x"
              v-model="pos.x"
              type="range"
              min="0"
              max="100"
              step="0.01"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{pos.x}}%
              </div>
            </b-input-group-text>
          </b-input-group>
        </b-form-group>

        <b-form-group label-cols-sm="4" label-cols-lg="3"
                :label="translate('dialog.position.y')"
                label-for="font.size">
          <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
            <b-form-input
              id="position.y"
              v-model="pos.y"
              type="range"
              min="0"
              max="100"
              step="0.01"
            ></b-form-input>
            <b-input-group-text slot="append" class="pr-3 pl-3">
              <div style="width: 3rem;">
                {{pos.y}}%
              </div>
            </b-input-group-text>
          </b-input-group>
        </b-form-group>
      </b-card-body>

      <div class="w-25 m-auto pb-4" :key="timestamp">
        <div class="w-100" ref="example">
          <b-aspect aspect="16:9" class="border-primary border" style="position: relative">
            <fa icon="square" size="xs" class="text-primary" style="position:absolute;" :style="positionGenerator('anchor')" ref="anchor"/>
            <div style="font-size: 1rem; position:absolute;" :style="positionGenerator('text')" ref="text">EXAMPLE TEXT</div>
          </b-aspect>
        </div>
      </div>
    </b-collapse>
  </b-card>
</template>

<script lang="ts">
import { Vue, Component, PropSync, } from 'vue-property-decorator';

import type { RandomizerInterface } from 'src/bot/database/entity/randomizer';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faSquare } from '@fortawesome/free-solid-svg-icons';
library.add(faSquare)

@Component({})
export default class fontCustomizer extends Vue {
  @PropSync('position') pos!: RandomizerInterface['position']

  timestamp = 0;
  interval = 0;

  mounted() {
    this.interval = window.setInterval(() => this.timestamp = Date.now(), 200);
  }

  destroyed() {
    window.clearInterval(this.interval);
  }

  positionGenerator(ref:string): { transform: string } {
    if (this.$refs.example && this.$refs[ref]) {
      const el = this.$refs[ref] as HTMLElement;
      const widthPxPerCent = (this.$refs.example as HTMLElement).getBoundingClientRect().width / 100;
      const heightPxPerCent = (this.$refs.example as HTMLElement).getBoundingClientRect().height / 100;

      let top = 0;
      if (this.pos.anchorY === 'middle') {
        top = el.getBoundingClientRect().height / 2;
      } else if (this.pos.anchorY === 'bottom') {
        top = el.getBoundingClientRect().height;
      }

      let left = 0;
      if (this.pos.anchorX === 'middle') {
        left = el.getBoundingClientRect().width / 2;
      } else if (this.pos.anchorX === 'right') {
        left = el.getBoundingClientRect().width;
      }

      return {
        transform: `translate(${(this.pos.x * widthPxPerCent) - left}px, ${(this.pos.y * heightPxPerCent) - top}px)`,
      };
    } else {
      return {
        transform: `translate(0, 0)`,
      };
    }
  }
}
</script>