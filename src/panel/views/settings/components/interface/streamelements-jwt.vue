<template>
  <div class="input-group">
    <div class="input-group-prepend">
      <span class="input-group-text">
        <template v-if="typeof translatedTitle === 'string'">{{ translatedTitle }}</template>
        <template v-else-if="typeof translatedTitle === 'object'">
          {{ translatedTitle.title }}
          <small style="cursor: help;" class="text-info ml-1" data-toggle="tooltip" data-html="true" :title="translatedTitle.help">[?]</small>
        </template>
      </span>
    </div>
    <input @focus="show = true" @blur="show = false" v-model="currentValue" class="form-control" :type="!show ? 'password' : 'text'" />
    <div class="input-group-append" v-if="currentValue.length > 0">
      <b-button @click="validate" :variant="getVariantByState(validationState)">
        <template v-if="validationState === ButtonStates.idle">Validate</template>
        <template v-else-if="validationState === ButtonStates.progress"><b-spinner small></b-spinner></template>
        <template v-else-if="validationState === ButtonStates.fail">{{ translate('integrations.pubg.something_went_wrong') }}
          <svg width="1.3em" height="1.3em" viewBox="0 0 16 16" class="bi bi-exclamation" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
        </template>
        <template v-else-if="validationState === ButtonStates.success">{{ translate('integrations.pubg.ok') }}
          <svg width="1.3em" height="1.3em" viewBox="0 0 16 16" class="bi bi-check2-circle" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L8 9.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            <path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1 0 13.5 8a.5.5 0 0 1 1 0 6.5 6.5 0 1 1-3.25-5.63.5.5 0 1 1-.5.865A5.472 5.472 0 0 0 8 2.5z"/>
          </svg>
        </template>
      </b-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import { isFinite } from 'lodash-es';
import translate from 'src/panel/helpers/translate';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { getVariantByState } from 'src/panel/helpers/variant';
import Axios from 'axios';

@Component({})
export default class textInput extends Vue {
  getVariantByState = getVariantByState;
  ButtonStates = ButtonStates;
  translate = translate;

  @Prop() readonly value!: any;
  @Prop() readonly defaultValue!: any;
  @Prop() readonly title!: string;
  @Prop() readonly type: any;
  @Prop() readonly readonly: any;
  @Prop() readonly secret: any;

  show: boolean = false;
  currentValue = this.value;
  translatedTitle = translate(this.title);

  validationState: number = ButtonStates.idle

  @Watch('currentValue')
  update() {
    if (this.type === 'number') {
      if (isFinite(Number(this.currentValue))) {
        this.currentValue = Number(this.currentValue);
      } else {
        this.currentValue = this.value;
      };
    }
    this.$emit('update', { value: this.currentValue });
  }

  async validate() {
    this.validationState = ButtonStates.progress;
    try {
      await Axios("https://api.streamelements.com/kappa/v2/channels/me", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + this.currentValue,
        }
      });

      // we don't need to check anything, if request passed it is enough
      this.validationState = ButtonStates.success;
      setTimeout(() => {
        this.validationState = ButtonStates.idle;
      }, 1000);
    } catch (e) {
      error(e);
      this.validationState = ButtonStates.fail;
      setTimeout(() => {
        this.validationState = ButtonStates.idle;
      }, 1000)
    }
  }
}
</script>

