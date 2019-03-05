<template>
  <buttonWithIcon icon="save"
                  class="btn-primary"
                  event="save"
                  @save="save()"
                  :text="translate('dialog.buttons.' + this.text + '.idle')"
                  v-if="state === 0"/>
  <buttonWithIcon icon="spinner"
                  spin="true"
                  class="btn-primary"
                  disabled="true"
                  :text="translate('dialog.buttons.' + this.text + '.progress')"
                  v-else-if="state === 1"/>
  <buttonWithIcon icon="check"
                  class="btn-success"
                  disabled="true"
                  :text="translate('dialog.buttons.' + this.text + '.done')"
                  v-else-if="state === 2"/>
  <buttonWithIcon icon="times"
                  class="btn-danger"
                  disabled="true"
                  :text="translate('dialog.buttons.something-went-wrong')"
                  v-else-if="state === 3"/>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['state', 'text'],
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

