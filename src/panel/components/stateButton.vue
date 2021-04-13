<template>
  <buttonWithIcon
    v-if="invalid"
    icon="exclamation"
    :class="'btn-danger'"
    disabled
    :text="translate('dialog.buttons.' + this.text + '.invalid')"
  />
  <buttonWithIcon
    v-else-if="state === 0"
    :icon="icon || 'save'"
    :class="cl || 'btn-primary'"
    event="save"
    :text="translate('dialog.buttons.' + this.text + '.idle')"
    @save="save()"
  />
  <buttonWithIcon
    v-else-if="state === 1"
    icon="spinner"
    spin
    :class="cl || 'btn-primary'"
    disabled
    :text="translate('dialog.buttons.' + this.text + '.progress')"
  />
  <buttonWithIcon
    v-else-if="state === 2"
    icon="check"
    class="btn-success"
    :class="{ 'btn-shrink': (cl || '').includes('shrink') }"
    disabled
    :text="translate('dialog.buttons.' + this.text + '.done')"
  />
  <buttonWithIcon
    v-else-if="state === 3"
    icon="times"
    class="btn-danger"
    :class="{ 'btn-shrink': (cl || '').includes('shrink') }"
    disabled
    :text="translate('dialog.buttons.something-went-wrong')"
  />
</template>

<script lang="ts">
import translate from '@sogebot/ui-helpers/translate';
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
  components: { buttonWithIcon: () => import('./button.vue') },
  props:      {
    state:   Number,
    text:    String,
    icon:    [String, Array],
    cl:      String,
    invalid: Boolean,
  },
  setup(props, context) {
    const save = () => {
      context.emit('click');
    };
    return { save, translate };
  },
});
</script>
