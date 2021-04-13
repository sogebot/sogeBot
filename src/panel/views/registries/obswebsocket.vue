<template>
  <b-container
    ref="window"
    fluid
  >
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.obswebsocket') }}
        </span>
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
          {{ translate('integrations.obswebsocket.new') }}
        </button-with-icon>
      </template>
    </panel>

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
            text="test"
            icon="vial"
            :state="state.test"
            :invalid="state.invalid"
            class="mx-2"
            @click="EventBus.$emit('registry::obswebsocket::test::' + $route.params.id)"
          />
          <state-button
            text="saveChanges"
            :state="state.save"
            :invalid="state.invalid"
            @click="EventBus.$emit('registry::obswebsocket::save::' + $route.params.id)"
          />
        </div>
      </template>
      <obswebsocket-edit
        v-if="$route.params.id"
        :id="$route.params.id"
        :save-state.sync="state.save"
        :test-state.sync="state.test"
        :invalid.sync="state.invalid"
        :pending.sync="state.pending"
        @refresh="refresh"
      />
    </b-sidebar>
    <loading v-if="state.loading === $state.progress" />
    <div v-else>
      <b-alert
        v-if="state.loading === $state.success && filtered.length === 0 && search.length > 0"
        show
        variant="danger"
      >
        <fa icon="search" /> <span v-html="translate('integrations.obswebsocket.emptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="state.loading === $state.success && items.length === 0"
        show
      >
        {{ translate('integrations.obswebsocket.empty') }}
      </b-alert>
      <b-table
        v-else
        :fields="fields"
        :items="filtered"
        small
        hover
        striped
        style="cursor: pointer;"
      >
        <template #cell(command)="data">
          <span
            v-b-tooltip.hover
            class="variable"
            :title="copied ? 'Copied!': 'Copy to clipboard'"
            @click="copy(command + ' ' + data.item.id)"
          >{{ command }} {{ data.item.id }}</span>
        </template>
        <template #cell(buttons)="data">
          <div class="text-right">
            <button-with-icon
              class="btn-only-icon btn-primary btn-reverse"
              icon="edit"
              :href="'#/registry/obswebsocket/edit/' + data.item.id"
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
import { library } from '@fortawesome/fontawesome-svg-core';
import { faVial } from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, getCurrentInstance, onMounted, ref, watch,
} from '@vue/composition-api';
import { escapeRegExp, isNil } from 'lodash-es';
import shortid from 'shortid';

library.add(faVial);

import type { OBSWebsocketInterface } from 'src/bot/database/entity/obswebsocket';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { capitalize } from 'src/panel/helpers/capitalize';
import { EventBus } from 'src/panel/helpers/event-bus';

const socket = getSocket('/integrations/obswebsocket');

export default defineComponent({
  components: {
    loading:          () => import('src/panel/components/loading.vue'),
    obswebsocketEdit: () => import('./obswebsocket-edit.vue'),
  },
  setup(props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const command = ref('!obsws run');
    const copied = ref(false);
    const search = ref('');
    const items = ref([] as OBSWebsocketInterface[]);
    const state = ref({
      loading: ButtonStates.progress,
      save:    ButtonStates.idle,
      test:    ButtonStates.idle,
      pending: false,
      invalid: false,
    } as {
      loading: number;
      save: number;
      test: number;
      pending: boolean;
      invalid: boolean;
    });
    const filtered = computed(() => {
      if (search.value.length === 0) {
        return items.value;
      }
      return items.value.filter((o) => {
        const isSearchInName = !isNil(o.name.match(new RegExp(escapeRegExp(search.value), 'ig')));
        return isSearchInName;
      });
    });
    const fields = [
      {
        key: 'name', label: translate('timers.dialog.name'), sortable: true,
      },
      // virtual attributes
      { key: 'command', label: translate('integrations.obswebsocket.command') },
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
      socket.emit('integration::obswebsocket::getCommand', (cmd: string) => {
        command.value = cmd;
      });
      socket.emit('generic::getAll', (err: string | null, _items: OBSWebsocketInterface[]) => {
        items.value = _items;
        state.value.loading = ButtonStates.success;
      });
    };

    const newItem = () => {
      ctx.root.$router.push({ name: 'OBSWebsocketRegistryEdit', params: { id: shortid.generate() } }).catch(() => {
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
        ctx.root.$router.push({ name: 'OBSWebsocketRegistryList' }).catch(() => {
          return;
        });
      } else {
        state.value.save = ButtonStates.idle;
      }
    };
    const del = (item: Required<OBSWebsocketInterface>) => {
      if (confirm(`Do you want to delete ${item.name}?`)) {
        socket.emit('generic::deleteById', item.id, () => {
          items.value = items.value.filter((o) => o.id !== item.id);
        });
      }
    };
    const update = (item: OBSWebsocketInterface) => {
      socket.emit('timers::save', item, () => {
        return;
      });
    };

    function copy(text: string) {
      navigator.clipboard.writeText(text);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 1000);
    }

    return {
      search,
      state,
      items,
      fields,
      newItem,
      filtered,
      update,
      del,
      refresh,
      copied,
      copy,
      command,

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
