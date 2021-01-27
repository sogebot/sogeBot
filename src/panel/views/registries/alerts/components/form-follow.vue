<template>
  <div>
    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label-for="'enabled' + data.id"
      :label="translate('registry.alerts.enabled')"
    >
      <b-form-checkbox v-bind:key="'enabled' + data.id" :id="'enabled' + data.id" v-model="data.enabled" :name="'enabled' + data.id" switch></b-form-checkbox>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.title.name')"
      :label-for="'title' + data.id"
    >
      <b-form-input
        :id="'title' + data.id"
        v-model="data.title"
        type="text"
        :placeholder="translate('registry.alerts.title.placeholder')"
        @input="$v.data.$touch()"
      ></b-form-input>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.filter.name')"
      :label-for="'filter' + data.id"
    >
      <query-filter
        :key="'filter-' + data.id"
        :filter.sync="data.filter"
        :rules="rules"
      ></query-filter>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.variant.name')"
      :label-for="'variant' + data.id"
    >
      <variant
        :key="'variant-' + data.id"
        :amount.sync="data.variantAmount"
        :state="$v.data.variantAmount.$invalid && $v.data.variantAmount.$dirty ? false : null"
      ></variant>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.messageTemplate.name')"
      :label-for="'messageTemplate' + data.id"
      :description="translate('registry.alerts.messageTemplate.help')"
    >
      <b-form-input
        :id="'messageTemplate' + data.id"
        v-model="data.messageTemplate"
        type="text"
        :placeholder="translate('registry.alerts.messageTemplate.placeholder')"
        @input="$v.data.$touch()"
        :state="$v.data.messageTemplate.$invalid && $v.data.messageTemplate.$dirty ? false : null"></b-form-input>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.animationText.name')"
      :label-for="'animationText' + data.id"
    >
      <text-animation
        :id="'animationText' + data.id"
        :animation.sync="data.animationText"
        :animationOptions.sync="data.animationTextOptions"
      ></text-animation>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.animationIn.name')"
      :label-for="'animationIn' + data.id"
    >
      <animation-in
        :id="'animationIn' + data.id"
        :animation.sync="data.animationIn"
        :animationDuration.sync="data.animationInDuration"
      ></animation-in>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.animationOut.name')"
      :label-for="'animationOut' + data.id"
    >
      <animation-out
        :id="'animationOut' + data.id"
        :animation.sync="data.animationOut"
        :animationDuration.sync="data.animationOutDuration"
      ></animation-out>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.alertDurationInMs.name')"
                  :label-for="'alertDurationInMs' + data.id">
      <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
        <b-form-input
          :id="'alertDurationInMs' + data.id"
          v-model.number="data.alertDurationInMs"
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
                  :label-for="'alertTextDelayInMs' + data.id">
      <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
        <b-form-input
          :id="'alertTextDelayInMs' + data.id"
          v-model.number="data.alertTextDelayInMs"
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
            :label="translate('registry.alerts.soundVolume.name')"
            :label-for="'soundVolume' + data.id">
      <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
        <b-form-input
          :id="'soundVolume' + data.id"
          v-model.number="data.soundVolume"
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
      :label-for="'enableAdvancedMode' + data.id"
      :label="translate('registry.alerts.enableAdvancedMode')"
    >
      <b-form-checkbox v-bind:key="'enableAdvancedMode' + data.id" :id="'enableAdvancedMode' + data.id" v-model="data.enableAdvancedMode" :name="'enableAdvancedMode' + data.id" switch></b-form-checkbox>
    </b-form-group>

    <div class="btn-group col-md-12 p-0" role="group" v-if="data.enableAdvancedMode">
      <button type="button" class="btn" @click="customShow = 'html'" :class="[customShow === 'html' ? 'btn-dark' : 'btn-outline-dark']">HTML</button>
      <button type="button" class="btn" @click="customShow = 'css'" :class="[customShow === 'css' ? 'btn-dark' : 'btn-outline-dark']">CSS</button>
      <button type="button" class="btn" @click="customShow = 'js'" :class="[customShow === 'js' ? 'btn-dark' : 'btn-outline-dark']">JS</button>
    </div>
    <div class="col-md-12 p-0 pb-2" v-if="data.enableAdvancedMode" :key="customShow + data.id + 'advancedMode'">
      <codemirror style="font-size: 0.8em;" v-if="customShow === 'html'" class="w-100" v-model="data.advancedMode.html" :options="{
        tabSize: 4,
        mode: 'text/html',
        theme: 'base16-' + theme,
        lineNumbers: true,
        line: true,
      }"></codemirror>
      <codemirror style="font-size: 0.8em;" v-if="customShow === 'js'" class="w-100" v-model="data.advancedMode.js" :options="{
        tabSize: 4,
        mode: 'text/javascript',
        theme: 'base16-' + theme,
        lineNumbers: true,
        line: true,
      }"></codemirror>
      <codemirror style="font-size: 0.8em;" v-if="customShow === 'css'" class="w-100"  v-model="data.advancedMode.css" :options="{
        tabSize: 4,
        mode: 'text/css',
        theme: 'base16-' + theme,
        lineNumbers: true,
        line: true,
      }"></codemirror>
      <b-btn @click="revertCode" variant="primary" class="mt-2 mb-2">{{translate('registry.alerts.revertcode')}}</b-btn>
    </div>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
                  v-if="!data.enableAdvancedMode"
                  :label="translate('registry.alerts.layoutPicker.name')">
      <layout-picker :layout.sync="data.layout"/>
    </b-form-group>

    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block v-b-toggle="'accordion-image-' + data.id" variant="light" class="text-left">{{translate('registry.alerts.image.setting')}}</b-button>
      </b-card-header>
      <b-collapse :id="'accordion-image-' + data.id" :accordion="'accordion-image-' + data.id" role="tabpanel">
        <b-card-body>
          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.image.name')"
                  :label-for="'image' + data.id">
            <media :media.sync="data.imageId" type="image" socket="/registries/alerts" :key="'image-' + data.imageId" :volume="data.soundVolume"/>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.scale.name')"
                  :label-for="'scale' + data.id">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'scale' + data.id"
                v-model.number="data.imageOptions.scale"
                type="range"
                min="0"
                max="500"
                step="1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{data.imageOptions.scale}}%
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.translateX.name')"
                  :label-for="'translateX' + data.id">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'translateX' + data.id"
                v-model.number="data.imageOptions.translateX"
                type="range"
                min="-1000"
                max="1000"
                step="1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{data.imageOptions.translateX}}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>

          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.translateY.name')"
                  :label-for="'translateY' + data.id">
            <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
              <b-form-input
                :id="'translateY' + data.id"
                v-model.number="data.imageOptions.translateY"
                type="range"
                min="-1000"
                max="1000"
                step="1"
              ></b-form-input>
              <b-input-group-text slot="append" class="pr-3 pl-3">
                <div style="width: 3rem;">
                  {{data.imageOptions.translateY}}px
                </div>
              </b-input-group-text>
            </b-input-group>
          </b-form-group>
        </b-card-body>
      </b-collapse>
    </b-card>

    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block v-b-toggle="'accordion-sound-' + data.id" variant="light" class="text-left">{{translate('registry.alerts.sound.setting')}}</b-button>
      </b-card-header>
      <b-collapse :id="'accordion-sound-' + data.id" :accordion="'accordion-sound-' + data.id" role="tabpanel">
        <b-card-body>
          <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.sound.name')"
                  :label-for="'sound' + data.id">
            <media :media.sync="data.soundId" type="audio" socket="/registries/alerts" :volume="data.soundVolume" :key="'sound-' + data.soundId"/>
          </b-form-group>
        </b-card-body>
      </b-collapse>
    </b-card>

    <font :data.sync="data.font" key="form-follow-font"/>

    <hold-button @trigger="$emit('delete', data.id)" icon="trash" class="btn-danger btn-block btn-reverse mt-3">
      <template slot="title">{{translate('dialog.buttons.delete')}}</template>
      <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
    </hold-button>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, PropSync, Watch } from 'vue-property-decorator';
import type { CommonSettingsInterface } from 'src/bot/database/entity/alert';
import { get } from 'lodash-es';
import translate from 'src/panel/helpers/translate';

import { codemirror } from 'vue-codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/htmlmixed/htmlmixed.js';
import 'codemirror/mode/css/css.js';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/lib/codemirror.css';
import text from 'src/bot/data/templates/alerts.txt';
import textjs from 'src/bot/data/templates/alerts-js.txt';

import { Validations } from 'vuelidate-property-decorators';
import { required, minValue } from 'vuelidate/lib/validators'

@Component({
  components: {
    codemirror,
    media: () => import('src/panel/components/media.vue'),
    'layout-picker': () => import('./layout-picker.vue'),
    'text-animation': () => import('./text-animation.vue'),
    'animation-in': () => import('./animation-in.vue'),
    'animation-out': () => import('./animation-out.vue'),
    'variant': () => import('./variant.vue'),
    'query-filter': () => import('./query-filter.vue'),
    'font': () => import('src/panel/components/font.vue'),
    'hold-button': () => import('../../../../components/holdButton.vue'),
  }
})
export default class AlertsEditFollowForm extends Vue {
  @PropSync('alert') data !: CommonSettingsInterface
  @Prop() readonly index !: number
  @Prop() readonly event !: string
  @Prop() readonly validationDate !: number

  theme = localStorage.getItem('theme') || get(this.$store.state, 'configuration.core.ui.theme', 'light');
  customShow: 'html' | 'css' | 'js' = 'html';
  fonts: {text: string; value: string}[] = [];
  get = get;
  translate = translate;
  rules: [string, string][] = [];

  @Watch('validationDate')
  touchValidation() {
    this.$v.$touch();
  }

  @Watch('data', { deep: true })
  @Watch('$v', { deep: true })
  emitValidation() {
    this.$emit('update')
    this.$emit('update:isValid', !this.$v.$error)
  }

  @Validations()
  validations = {
    data: {
      variantAmount: {required, minValue: minValue(0)},
      messageTemplate: {required},
    }
  }

  revertCode() {
    if (this.customShow === 'css') {
      this.data.advancedMode[this.customShow] = '';
    } else if (this.customShow === 'js') {
      this.data.advancedMode[this.customShow] = textjs;
    } else if (this.customShow === 'html') {
      this.data.advancedMode[this.customShow] = text;
    }
  }

  created() {
    switch (this.$props.event) {
      case 'subs':
        this.rules = [['username', 'string'], ['tier', 'tier']];
        break;
      case 'subgifts':
        this.rules = [['username', 'string'], ['recipient', 'string'], ['amount', 'number']];
        break;
      case 'cmdredeems':
        this.rules = [['name', 'string'], ['recipient', 'string'], ['amount', 'number']];
        break;
      case 'rewardredeems':
        this.rules = [['name', 'string'], ['recipient', 'string']];
        break;
      case 'subcommunitygifts':
      case 'hosts':
      case 'raids':
        this.rules = [['username', 'string'], ['amount', 'number']];
        break;
      default:
        this.rules = [['username', 'string']];
        break;
    }
  }

  async mounted() {
    if (this.data.advancedMode.html === null) {
      this.data.advancedMode.html = text;
    }
    if (this.data.advancedMode.js === null) {
      this.data.advancedMode.js = textjs;
    }
    const { response } = await new Promise<{ response: Record<string, any>}>(resolve => {
      const request = new XMLHttpRequest();
      request.open('GET', '/fonts', true);

      request.onload = function() {
        if (!(this.status >= 200 && this.status < 400)) {
          console.error('Something went wrong getting font', this.status, this.response)
        }
        resolve({ response: JSON.parse(this.response)})
      }
      request.onerror = function() {
        console.error('Connection error to sogebot')
        resolve( { response: {} });
      };

      request.send();
    })
    this.fonts = response.items.map((o: { family: string }) => {
      return { text: o.family, value: o.family }
    })
    this.emitValidation();
  }
}
</script>

<style>
  .col-form-label {
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