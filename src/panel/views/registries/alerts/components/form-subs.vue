<template>
  <div>
    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      label-for="enabled"
      :label="translate('registry.alerts.enabled')"
    >
      <b-form-checkbox id="enabled" v-model="data.enabled" name="enabled" switch></b-form-checkbox>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.title.name')"
      label-for="title"
    >
      <b-form-input
        id="title"
        v-model="data.title"
        type="text"
        :placeholder="translate('registry.alerts.title.placeholder')"
        @input="$v.data.$touch()"
      ></b-form-input>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.variant.name')"
      label-for="variant"
    >
      <variant
        :condition.sync="data.variantCondition"
        :amount.sync="data.variantAmount"
        :state="$v.data.variantAmount.$invalid && $v.data.variantAmount.$dirty ? 'invalid' : null"
      ></variant>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.messageTemplate.name')"
      label-for="messageTemplate"
      :description="translate('registry.alerts.messageTemplate.help')"
    >
      <b-form-input
        id="messageTemplate"
        v-model="data.messageTemplate"
        type="text"
        :placeholder="translate('registry.alerts.messageTemplate.placeholder')"
        @input="$v.data.$touch()"
        :state="$v.data.messageTemplate.$invalid && $v.data.messageTemplate.$dirty ? 'invalid' : null"
      ></b-form-input>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.messageTemplateResub.name')"
      label-for="messageTemplate"
      :description="translate('registry.alerts.messageTemplateResub.help')"
    >
      <b-form-input
        id="messageTemplateResub"
        v-model="data.messageTemplateResub"
        type="text"
        :placeholder="translate('registry.alerts.messageTemplateResub.placeholder')"
        @input="$v.data.$touch()"
        :state="$v.data.messageTemplateResub.$invalid && $v.data.messageTemplateResub.$dirty ? 'invalid' : null"
      ></b-form-input>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.animationText.name')"
      label-for="animationText"
    >
      <text-animation
        id="animationText"
        :animation.sync="data.animationText"
        :animationOptions.sync="data.animationTextOptions"
      ></text-animation>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.animationIn.name')"
      label-for="animationIn"
    >
      <animation-in
        id="animationIn"
        :animation.sync="data.animationIn"
      ></animation-in>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.animationOut.name')"
      label-for="animationOut"
    >
      <animation-out
        id="animationOut"
        :animation.sync="data.animationOut"
      ></animation-out>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.alertDurationInMs.name')"
                  label-for="alertDurationInMs">
      <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
        <b-form-input
          id="alertDurationInMs"
          v-model="data.alertDurationInMs"
          type="range"
          min="0"
          max="60000"
          step="500"
        ></b-form-input>
        <b-input-group-text slot="append" class="pr-3 pl-3">
          <div style="width: 3rem;">
            {{ String(data.alertDurationInMs / 1000) + 's' }}
          </div>
        </b-input-group-text>
      </b-input-group>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.alertTextDelayInMs.name')"
                  label-for="alertTextDelayInMs">
      <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
        <b-form-input
          id="alertTextDelayInMs"
          v-model="data.alertTextDelayInMs"
          type="range"
          min="0"
          max="60000"
          step="500"
        ></b-form-input>
        <b-input-group-text slot="append" class="pr-3 pl-3">
          <div style="width: 3rem;">
            {{ String(data.alertTextDelayInMs / 1000) + 's' }}
          </div>
        </b-input-group-text>
      </b-input-group>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.layoutPicker.name')">
      <layout-picker :layout.sync="data.layout"/>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
            :label="translate('registry.alerts.image.name')"
            label-for="image">
      <media :media.sync="data.image" type="image"/>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
            :label="translate('registry.alerts.sound.name')"
            label-for="sound">
      <media :media.sync="data.sound" type="audio" :volume="data.soundVolume"/>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
            :label="translate('registry.alerts.soundVolume.name')"
            label-for="soundVolume">
      <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
        <b-form-input
          id="soundVolume"
          v-model="data.soundVolume"
          type="range"
          min="0"
          max="100"
          step="1"
        ></b-form-input>
        <b-input-group-text slot="append" class="pr-3 pl-3">
          <div style="width: 3rem;">
            {{data.soundVolume}}%
          </div>
        </b-input-group-text>
      </b-input-group>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      label-for="enableAdvancedMode"
      :label="translate('registry.alerts.enableAdvancedMode')"
    >
      <b-form-checkbox id="enableAdvancedMode" v-model="data.enableAdvancedMode" name="enableAdvancedMode" switch></b-form-checkbox>
    </b-form-group>

    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block href="#" v-b-toggle.accordion-2 variant="light" class="text-left">{{translate('registry.alerts.message.setting')}}</b-button>
      </b-card-header>
      <b-collapse id="accordion-2" accordion="message-accordion" role="tabpanel">
        <b-card-body>
          <b-form-group
            label-cols-sm="4"
            label-cols-lg="3"
            :label="translate('registry.alerts.allowEmotes.name')">
            <b-form-checkbox v-model="data.message.allowEmotes.twitch" name="twitch">Twitch</b-form-checkbox>
            <b-form-checkbox v-model="data.message.allowEmotes.ffz" name="ffz">FrankenFaceZ</b-form-checkbox>
            <b-form-checkbox v-model="data.message.allowEmotes.bttv" name="bttv">BetterTTV</b-form-checkbox>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                       :label="translate('registry.alerts.font.name')">
            <b-form-select v-model="data.message.font.family" :options="fonts" plain></b-form-select>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.size.name')"
                  label-for="font.size">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.size"
                v-model="data.message.font.size"
                type="range"
                min="1"
                max="200"
                step="1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{data.message.font.size}}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.weight.name')"
                  label-for="font.weight">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.weight"
                v-model="data.message.font.weight"
                type="range"
                min="100"
                max="900"
                step="100"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ data.message.font.weight}}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.borderPx.name')"
                  label-for="font.borderPx">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.borderPx"
                v-model="data.message.font.borderPx"
                type="range"
                min="0"
                max="100"
                step="1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ data.message.font.borderPx}}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.borderColor.name')"
                  label-for="font.borderColor">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.borderColor"
                v-model="data.message.font.borderColor"
                type="color"
              ></b-form-input>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.color.name')"
                  label-for="font.color">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.color"
                v-model="data.message.font.color"
                type="color"
              ></b-form-input>
            </b-input-group>
          </b-form-group>
        </b-card-body>
      </b-collapse>
    </b-card>

    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block href="#" v-b-toggle.accordion-1 variant="light" class="text-left">{{translate('registry.alerts.font.setting')}}</b-button>
      </b-card-header>
      <b-collapse id="accordion-1" accordion="my-accordion" role="tabpanel">
        <b-card-body>
          <b-form-group label-cols-sm="4" label-cols-lg="3"
                       :label="translate('registry.alerts.alertDurationInMs.name')">
            <b-form-select v-model="data.font.family" :options="fonts" plain></b-form-select>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.size.name')"
                  label-for="font.size">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.size"
                v-model="data.font.size"
                type="range"
                min="1"
                max="200"
                step="1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{data.font.size}}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.weight.name')"
                  label-for="font.weight">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.weight"
                v-model="data.font.weight"
                type="range"
                min="100"
                max="900"
                step="100"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ data.font.weight}}
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.borderPx.name')"
                  label-for="font.borderPx">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.borderPx"
                v-model="data.font.borderPx"
                type="range"
                min="0"
                max="100"
                step="1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{ data.font.borderPx}}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.borderColor.name')"
                  label-for="font.borderColor">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.borderColor"
                v-model="data.font.borderColor"
                type="color"
              ></b-form-input>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.color.name')"
                  label-for="font.color">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.color"
                v-model="data.font.color"
                type="color"
              ></b-form-input>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.font.highlightcolor.name')"
                  label-for="font.highlightcolor">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                id="font.highlightcolor"
                v-model="data.font.highlightcolor"
                type="color"
              ></b-form-input>
            </b-input-group>
          </b-form-group>
        </b-card-body>
      </b-collapse>
    </b-card>

    <hold-button @trigger="$emit('delete', data.uuid)" icon="trash" class="btn-danger btn-block btn-reverse mt-3">
      <template slot="title">{{translate('dialog.buttons.delete')}}</template>
      <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
    </hold-button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Watch } from 'vue-property-decorator';

import axios from 'axios';

import { Validations } from 'vuelidate-property-decorators';
import { required, minValue } from 'vuelidate/lib/validators'

@Component({
  components: {
    media: () => import('../../../../components/media'),
    'layout-picker': () => import('./layout-picker'),
    'text-animation': () => import('./text-animation'),
    'animation-in': () => import('./animation-in'),
    'animation-out': () => import('./animation-out'),
    'variant': () => import('./variant'),
    'hold-button': () => import('../../../../components/holdButton'),
  }
})
export default class AlertsEditFollowForm extends Vue {
  @PropSync('alert') readonly data !: Registry.Alerts.Follow
  @Prop() readonly index !: number

  fonts: {text: string; value: string}[] = [];

  @Watch('$v', { deep: true })
  emitValidation() {
    this.$emit('update:isValid', !this.$v.$error)
  }

  @Validations()
  validations = {
    data: {
      messageTemplate: {required},
      messageTemplateResub: {required},
      variantAmount: {required, minValue: minValue(0)},
      minAmountToAlert: {required, minValue: minValue(0)},
      message: {
        minAmountToShow: {required, minValue: minValue(0)},
      }
    }
  }

  mounted() {
    axios.get('/fonts')
      .then((r) => {
        this.fonts = r.data.items.map((o) => {
          return { text: o.family, value: o.family }
        })
      })
    this.emitValidation();
  }
}
</script>

<style>
  .col-form-label, .custom-control-label {
    font-size: 1rem !important;
    font-variant: inherit !important;
    font-weight: inherit !important;
    text-indent: inherit !important;
    letter-spacing: inherit !important;
    text-transform: none !important;
  }

  .custom-switch {
    padding-top: calc(0.375rem + 1px);
  }

  .custom-range {
    padding: 0 !important;
  }
</style>