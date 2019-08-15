<template>
  <b-form-group
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
    <b-form-invalid-feedback>{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
  </b-form-group>
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
