<template>
  <div>
    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.enabled')"
    >
      <b-form-checkbox v-model="data.enabled" name="enabled" switch></b-form-checkbox>
    </b-form-group>

    <b-form-group
      label-cols-sm="4"
      label-cols-lg="3"
      :label="translate('registry.alerts.messageTemplate.name')"
      label-for="name"
      :description="translate('registry.alerts.messageTemplate.help')"
    >
      <b-form-input
        id="text"
        v-model="data.messageTemplate"
        type="text"
        :placeholder="translate('registry.alerts.messageTemplate.placeholder')"
        @input="$v.data.messageTemplate.$touch()"
        :state="$v.data.messageTemplate.$invalid && $v.data.messageTemplate.$dirty ? 'invalid' : null"
      ></b-form-input>
    </b-form-group>

    <b-form-group label-cols-sm="4" label-cols-lg="3"
                  :label="translate('registry.alerts.alertDurationInMs.name')">
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
                  :label="translate('registry.alerts.alertTextDelayInMs.name')">
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

    <b-card no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button block href="#" v-b-toggle.accordion-1 variant="light" class="text-left">{{translate('registry.alerts.font.setting')}}</b-button>
      </b-card-header>
      <b-collapse id="accordion-1" accordion="my-accordion" role="tabpanel">
        <b-card-body>
          <b-card-text>I start opened because <code>visible</code> is <code>true</code></b-card-text>
          <b-card-text>{{ text }}</b-card-text>
        </b-card-body>
      </b-collapse>
    </b-card>
  </div>
</template>

<script lang="ts">
import { Vue, Component, PropSync, Watch } from 'vue-property-decorator';

import { Validations } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators'

@Component({})
export default class AlertsEditFollowForm extends Vue {
  @PropSync('alert') readonly data !: Registry.Alerts.Follow

  @Watch('$v', { deep: true })
  emitValidation() {
    this.$emit('update:isValid', !(!!this.$v.$invalid && !!this.$v.$dirty))
  }

  @Validations()
  validations = {
    data: {
      messageTemplate: {required},
    }
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
  }

  .custom-switch {
    padding-top: calc(0.375rem + 1px);
  }

  .custom-range {
    padding: 0 !important;
  }
</style>