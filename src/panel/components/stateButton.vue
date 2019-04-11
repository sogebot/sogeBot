<template>
  <buttonWithIcon icon="exclamation"
                  :class="'btn-danger'"
                  disabled="true"
                  :text="translate('dialog.buttons.' + this.text + '.invalid')"
                  v-if="invalid"/>
  <buttonWithIcon :icon="icon || 'save'"
                  :class="cl || 'btn-primary'"
                  event="save"
                  @save="save()"
                  :text="translate('dialog.buttons.' + this.text + '.idle')"
                  v-else-if="state === 0"/>
  <buttonWithIcon icon="spinner"
                  spin="true"
                  :class="cl || 'btn-primary'"
                  disabled="true"
                  :text="translate('dialog.buttons.' + this.text + '.progress')"
                  v-else-if="state === 1"/>
  <buttonWithIcon icon="check"
                  class="btn-success"
                  :class="{ 'btn-shrink': (cl || '').includes('shrink') }"
                  disabled="true"
                  :text="translate('dialog.buttons.' + this.text + '.done')"
                  v-else-if="state === 2"/>
  <buttonWithIcon icon="times"
                  class="btn-danger"
                  :class="{ 'btn-shrink': (cl || '').includes('shrink') }"
                  disabled="true"
                  :text="translate('dialog.buttons.something-went-wrong')"
                  v-else-if="state === 3"/>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['state', 'text', 'icon', 'cl', 'shrink', 'invalid'],
  components: {
    buttonWithIcon: () => import('./button.vue'),
  },
  methods: {
    save() {
      this.$emit('click');
    }
  }
})
</script>

