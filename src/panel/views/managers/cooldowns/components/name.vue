<template>
  <b-form-group
    :label="'Type to add command, keyword or group'"
    label-for="name"
  >
    <b-form-tags
      input-id="tags-basic"
      v-model="_value"
      class="p-1"
      placeholder="Type to add !command, keyword or group:nameOfGroup"
      :style="{
        height: value.length === 0 ? '48px !important' : 'inherit'
      }"
      no-outer-focus
      :remove-on-delete="true">
      <template v-slot="{tags, inputId, placeholder, disabled, addTag, removeTag }">
        <b-input-group style="height:2rem;">
          <b-form-input
            v-model="newTag"
            :id="inputId"
            :placeholder="placeholder"
            :disabled="disabled"
            @keydown.delete="newTag.length === 0 ? removeTag(tags[tags.length - 1]) : null"
            @keydown.enter="addTag(newTag); newTag = ''"
          ></b-form-input>
          <b-input-group-append>
            <b-button @click="addTag(newTag)" :disabled="disabled" variant="primary">Add</b-button>
          </b-input-group-append>
        </b-input-group>
        <ul class="list-inline d-inline-block mt-3 mb-0">
          <li v-for="tag in tags" :key="tag" class="b-form-tag d-inline-flex align-items-baseline mw-100">
            <span class="b-form-tag-content flex-grow-1 p-1" :class="{
              'badge-info': tag.startsWith('!'),
              'badge-success': tag.startsWith('group:'),
              'badge-danger': !tag.startsWith('!') && !tag.startsWith('group:'),
            }">
              <template v-if="tag.startsWith('!')">{{ translate('command') }}</template>
              <template v-else-if="tag.startsWith('group:')">{{ translate('group') }}</template>
              <template v-else>{{ translate('keyword') }}</template>
            </span>
            <span class="b-form-tag-content flex-grow-1 text-truncate p-1 pr-3 badge-secondary">{{ tag.replace('group:', '') }}
              <button @click="removeTag(tag)" aria-keyshortcuts="Delete" type="button" aria-label="Remove tag" class="close b-form-tag-remove" style="position:absolute; transform: translateX(3px) translateY(-2px);">×</button>
            </span>
          </li>
        </ul>
      </template>
    </b-form-tags>
  </b-form-group>
</template>

<script lang="ts">
import { Vue, Component, PropSync } from 'vue-property-decorator';
import type { CooldownInterface } from 'src/bot/database/entity/cooldown';

@Component({})
export default class extends Vue {
  @PropSync('value') _value!: CooldownInterface['value'];

  newTag = '';

  touch() {
    this.$emit('touch')
  }
};
</script>
