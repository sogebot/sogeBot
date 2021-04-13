<template>
  <b-container
    ref="window"
    fluid
  >
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.timers') }}
        </span>
      </b-col>
      <b-col
        v-if="!$systems.find(o => o.name === 'timers').enabled"
        style=" text-align: right;"
      >
        <b-alert
          show
          variant="danger"
          style="padding: .5rem; margin: 0; display: inline-block;"
        >
          <fa
            icon="exclamation-circle"
            fixed-width
          /> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel
      search
      @search="search = $event"
    >
      <template #left>
        <button-with-icon
          class="btn-primary btn-reverse"
          icon="plus"
          @click="newItem"
        >
          {{ translate('systems.timers.new') }}
        </button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === $state.progress" />
    <div v-else>
      <b-sidebar
        :visible="isSidebarVisible"
        :no-slide="!sidebarSlideEnabled"
        width="800px"
        no-close-on-route-change
        shadow
        no-header
        right
        backdrop
        @change="isSidebarVisibleChange"
      >
        <template #footer="{ hide }">
          <div
            class="d-flex bg-opaque align-items-center px-3 py-2 border-top border-gray"
            style="justify-content: flex-end"
          >
            <b-button
              class="mx-2"
              variant="link"
              @click="hide"
            >
              {{ translate('dialog.buttons.close') }}
            </b-button>
            <state-button
              text="saveChanges"
              :state="state.save"
              :invalid="state.invalid"
              @click="EventBus.$emit('managers::timers::save::' + $route.params.id)"
            />
          </div>
        </template>
        <timers-edit
          v-if="$route.params.id"
          :id="$route.params.id"
          :save-state.sync="state.save"
          :invalid.sync="state.invalid"
          :pending.sync="state.pending"
          @refresh="refresh"
        />
      </b-sidebar>
      <b-alert
        v-if="state.loading === $state.success && filtered.length === 0 && search.length > 0"
        show
        variant="danger"
      >
        <fa icon="search" /> <span v-html="translate('systems.timers.emptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="state.loading === $state.success && items.length === 0"
        show
      >
        {{ translate('systems.timers.empty') }}
      </b-alert>
      <b-table
        v-else
        :fields="fields"
        :items="filtered"
        hover
        small
        style="cursor: pointer;"
        @row-clicked="linkTo($event)"
      >
        <template #cell(responses)="data">
          <div><span class="font-weight-bold text-primary font-bigger">{{ data.item.messages.length }}</span></div>
        </template>
        <template #cell(buttons)="data">
          <div class="text-right">
            <button-with-icon
              :class="[ data.item.isEnabled ? 'btn-success' : 'btn-danger' ]"
              class="btn-only-icon btn-reverse"
              icon="power-off"
              @click="data.item.isEnabled = !data.item.isEnabled; update(data.item)"
            >
              {{ translate('dialog.buttons.' + (data.item.isEnabled? 'enabled' : 'disabled')) }}
            </button-with-icon>
            <button-with-icon
              class="btn-only-icon btn-primary btn-reverse"
              icon="edit"
              :href="'#/manage/timers/edit/' + data.item.id"
            >
              {{ translate('dialog.buttons.edit') }}
            </button-with-icon>

            <button-with-icon
              class="btn-only-icon btn-danger btn-reverse"
              icon="trash"
              @click="del(data.item)"
            >
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
      </b-table>
    </div>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, getCurrentInstance, onMounted, ref, watch,
} from '@vue/composition-api';
import { isNil } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { TimerInterface } from 'src/bot/database/entity/timer';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { capitalize } from 'src/panel/helpers/capitalize';
import { EventBus } from 'src/panel/helpers/event-bus';

const socket = getSocket('/systems/timers');

export default defineComponent({
  components: {
    loading:    () => import('src/panel/components/loading.vue'),
    timersEdit: () => import('./timers-edit.vue'),
  },
  setup(props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const search = ref('');
    const items = ref([] as TimerInterface[]);
    const state = ref({
      loading: ButtonStates.progress,
      save:    ButtonStates.idle,
      pending: false,
      invalid: false,
    } as {
      loading: number;
      save: number;
      pending: boolean;
      invalid: boolean;
    });
    const filtered = computed(() => {
      if (search.value.length === 0) {
        return items.value;
      }
      return items.value.filter((o) => {
        const isSearchInName = !isNil(o.name.match(new RegExp(search.value, 'ig')));
        return isSearchInName;
      });
    });
    const fields = [
      {
        key: 'name', label: translate('timers.dialog.name'), sortable: true,
      },
      { key: 'tickOffline', label: translate('timers.dialog.tickOffline') },
      // virtual attributes
      {
        key: 'triggerEveryMessage', label: translate('messages'), sortable: true, tdClass: 'font-weight-bold text-primary font-bigger',
      },
      {
        key: 'triggerEverySecond', label: capitalize(translate('seconds')), sortable: true, tdClass: 'font-weight-bold text-primary font-bigger',
      },
      { key: 'responses', label: translate('timers.dialog.responses') },
      { key: 'buttons', label: '' },
    ];

    onMounted(() => {
      refresh();
      if (ctx.root.$route.params.id) {
        isSidebarVisible.value = true;
        setTimeout(() => state.value.pending = false, 1000);
      }
    });

    watch(() => ctx.root.$route.params.id, (val) => {
      const $v = instance?.$v;
      $v?.$reset();
      if (val) {
        isSidebarVisible.value = true;
      } else {
        state.value.pending = false;
      }
    });

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, _items: TimerInterface[]) => {
        items.value = _items;
        state.value.loading = ButtonStates.success;
      });
    };

    const newItem = () => {
      ctx.root.$router.push({ name: 'TimersManagerEdit', params: { id: uuid() } }).catch(() => {
        return;
      });
    };
    const isSidebarVisibleChange = (isVisible: boolean, ev: any) => {
      if (!isVisible) {
        if (state.value.pending) {
          const isOK = confirm('You will lose your pending changes. Do you want to continue?');
          if (!isOK) {
            sidebarSlideEnabled.value = false;
            isSidebarVisible.value = false;
            ctx.root.$nextTick(() => {
              isSidebarVisible.value = true;
              setTimeout(() => {
                sidebarSlideEnabled.value = true;
              }, 300);
            });
            return;
          }
        }
        isSidebarVisible.value = isVisible;
        ctx.root.$router.push({ name: 'TimersManagerList' }).catch(() => {
          return;
        });
      } else {
        state.value.save = ButtonStates.idle;
      }
    };
    const del = (item: Required<TimerInterface>) => {
      if (confirm(`Do you want to delete timer ${item.name} with ${item.messages.length} message(s)?`)) {
        socket.emit('generic::deleteById', item.id, () => {
          items.value = items.value.filter((o) => o.id !== item.id);
        });
      }
    };
    const linkTo = (item: Required<TimerInterface>) => {
      console.debug('Clicked', item.id);
      ctx.root.$router.push({ name: 'TimersManagerEdit', params: { id: item.id } });
    };
    const update = (item: TimerInterface) => {
      socket.emit('timers::save', item, () => {
        return;
      });
    };

    return {
      search,
      state,
      items,
      fields,
      newItem,
      filtered,
      update,
      del,
      linkTo,
      refresh,

      isSidebarVisibleChange,
      isSidebarVisible,
      sidebarSlideEnabled,

      translate,
      ButtonStates,
      EventBus,
      capitalize,
    };
  },
});
</script>

<style scoped>
@media only screen and (max-width: 1000px) {
  .btn-shrink {
    padding: 0!important;
  }
  .btn-shrink .text {
    display: none !important;
  }
  .btn-shrink .btn-icon {
    background: transparent !important;
  }
}

.btn-only-icon .text {
  display: none !important;
}
.btn-only-icon .btn-icon {
  background: transparent !important;
}

.btn-with-icon {
  padding: 0;
  display: inline-block;
  width: fit-content;
}

.btn-with-icon .text + .btn-icon {
  background: rgba(0,0,0,0.15);
}

.btn-with-icon .btn-icon {
  display: inline-block;
  padding: 0.375rem 0.4rem;
  flex-shrink: 10;
}

.btn-with-icon .text {
  padding: 0.375rem 0.4rem;
}
</style>
