<template>
  <div v-if="isSystemEnabled">
    <div
      class="btn btn-sm"
      style="overflow: hidden;max-height: 30px;"
      :class="[completed === items.length ? btnClass + 'success' : btnClass + 'danger']"
      @click="toggleDisplay()"
    >
      {{ completed }}/{{ items.length }}
      <span><fa icon="tasks" /></span>
    </div>
    <div
      :class="[bDisplay ? 'd-block' : 'd-none']"
      style="position: absolute; width:200px; right: 1rem; z-index:9999999"
    >
      <div class="list-group">
        <button
          v-for="(item, index) of items"
          :key="index"
          type="button"
          style="padding: 0.25rem 1.25rem"
          class="list-group-item list-group-item-action"
          @click="toggle(item)"
        >
          <span
            class="pr-1"
            :class="[isItemCompleted(item)? 'text-success' : 'text-danger']"
          >
            <fa
              v-if="isItemCompleted(item)"
              :icon="['far', 'check-square']"
            />
            <fa
              v-else
              :icon="['far', 'square']"
            />
          </span>
          {{ item }}
        </button>
      </div>
      <div class="list-group list-group-item-info text-info p-2">
        Add new items in <a href="#/settings/systems/checklist">checklist settings</a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import {
  computed, defineComponent, onMounted, ref,
} from '@vue/composition-api';
import type { Ref } from '@vue/composition-api';

import type { ChecklistInterface } from 'src/bot/database/entity/checklist';
import { getListOf } from 'src/panel/helpers/getListOf';

library.add(faCheckSquare, faSquare);
const socket = getSocket('/systems/checklist');

type CheckedItem = { isCompleted: boolean; value: string; };

export default defineComponent({
  setup() {
    const bDisplay = ref(false);
    const items: Ref<ChecklistInterface[]> = ref([]);
    const checkedItems: Ref<CheckedItem[]> = ref([]);

    const btnClass = computed(() => {
      if (bDisplay.value) {
        return 'btn-';
      } else {
        return 'btn-outline-';
      }
    });
    const isSystemEnabled = computed(() => {
      return getListOf('systems').find(o => o.name === 'checklist')?.enabled ?? false;
    });
    const completed = computed(() => {
      return checkedItems.value.filter(o => o.isCompleted).length;
    });

    const toggle = (item: string) => {
      let checkedItem = checkedItems.value.find(o => o.value === item);
      if (!checkedItem) {
        checkedItem = {
          isCompleted: true,
          value:       item,
        };
        checkedItems.value.push(checkedItem);
      } else {
        checkedItem.isCompleted = !checkedItem.isCompleted;
      }
      socket.emit('checklist::save', checkedItem, () => {
        return;
      });
    };
    const toggleDisplay = () => {
      bDisplay.value = !bDisplay.value;
    };
    const update = () => {
      socket.emit('generic::getAll', (err: Error | null, itemsFromSocket: ChecklistInterface[], checkedItemsFromSocket: CheckedItem[]) => {
        if (err) {
          return console.error(err);
        }
        checkedItems.value = checkedItemsFromSocket;
        items.value = itemsFromSocket;
      });
    };
    const isItemCompleted = (item: string) => {
      const checkedItem = checkedItems.value.find(o => o.value === item);
      if (!checkedItem) {
        return false;
      } else {
        return checkedItem.isCompleted;
      }
    };

    onMounted(() => {
      if (isSystemEnabled.value) {
        update();
      }
    });

    return {
      isItemCompleted, toggleDisplay, completed, items, toggle, btnClass, isSystemEnabled, bDisplay,
    };
  },
});
</script>