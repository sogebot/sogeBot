<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.cooldown') }}
        </span>
      </b-col>
      <b-col
        v-if="!$systems.find(o => o.name === 'cooldown').enabled"
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
          {{ translate('systems.cooldown.new') }}
        </button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success" />
    <template v-else>
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
              :invalid="!!$v.$invalid && !!$v.$dirty"
              @click="save()"
            />
          </div>
        </template>
        <panel sidebar>
          <template #left>
            <template v-if="editationItem">
              <button-with-icon
                :class="[ editationItem.isErrorMsgQuiet ? 'btn-success' : 'btn-danger' ]"
                class="btn-reverse"
                :icon="editationItem.isErrorMsgQuiet ? 'volume-off' : 'volume-up'"
                @click="editationItem.isErrorMsgQuiet = !editationItem.isErrorMsgQuiet"
              >
                {{ translate(editationItem.isErrorMsgQuiet? 'quiet' : 'noisy') | capitalize }}
              </button-with-icon>
              <button-with-icon
                :class="[ editationItem.isOwnerAffected ? 'btn-success' : 'btn-danger' ]"
                class="btn-reverse"
                :icon="editationItem.isOwnerAffected ? 'check' : 'times'"
                @click="editationItem.isOwnerAffected = !editationItem.isOwnerAffected"
              >
                {{ translate('core.permissions.casters') | capitalize }}
              </button-with-icon>
              <button-with-icon
                :class="[ editationItem.isModeratorAffected ? 'btn-success' : 'btn-danger' ]"
                class="btn-reverse"
                :icon="editationItem.isModeratorAffected ? 'check' : 'times'"
                @click="editationItem.isModeratorAffected = !editationItem.isModeratorAffected"
              >
                {{ translate('core.permissions.moderators') | capitalize }}
              </button-with-icon>
              <button-with-icon
                :class="[ editationItem.isSubscriberAffected ? 'btn-success' : 'btn-danger' ]"
                class="btn-reverse"
                :icon="editationItem.isSubscriberAffected ? 'check' : 'times'"
                @click="editationItem.isSubscriberAffected = !editationItem.isSubscriberAffected"
              >
                {{ translate('core.permissions.subscribers') | capitalize }}
              </button-with-icon>
              <button-with-icon
                :class="[ editationItem.isFollowerAffected ? 'btn-success' : 'btn-danger' ]"
                class="btn-reverse"
                :icon="editationItem.isFollowerAffected ? 'check' : 'times'"
                @click="editationItem.isFollowerAffected = !editationItem.isFollowerAffected"
              >
                {{ translate('core.permissions.followers') | capitalize }}
              </button-with-icon>
              <button-with-icon
                :class="[ editationItem.type === 'global' ? 'btn-primary' : 'btn-secondary' ]"
                class="btn-reverse"
                :icon="editationItem.type === 'global' ? 'globe-europe' : 'user'"
                @click="editationItem.type = editationItem.type === 'global' ? 'user' : 'global'"
              >
                {{ translate(editationItem.type) | capitalize }}
              </button-with-icon>
            </template>
          </template>
        </panel>
        <div class="px-3 py-2">
          <loading v-if="!editationItem" />
          <b-form v-else>
            <b-form-group>
              <label-inside>{{ '!' + translate('command') + ', ' + translate('keyword') + ' ' + translate('or') + ' g:' + translate('group') }}</label-inside>
              <b-input-group>
                <b-form-input
                  id="name"
                  v-model="editationItem.name"
                  type="text"
                  :placeholder="'!' + translate('command') + ', ' + translate('keyword') + ' ' + translate('or') + ' g:' + translate('group')"
                  :state="$v.editationItem.name.$invalid && $v.editationItem.name.$dirty ? false : null"
                  @input="$v.editationItem.name.$touch()"
                />
              </b-input-group>
              <b-form-invalid-feedback :state="!($v.editationItem.name.$invalid && $v.editationItem.name.$dirty)">
                <template v-if="!$v.editationItem.name.minLength">
                  {{ translate('errors.minLength_of_value_is').replace('$value', 2) }}
                </template>
                <template v-else>
                  {{ translate('dialog.errors.required') }}
                </template>
              </b-form-invalid-feedback>
            </b-form-group>
            <b-form-group>
              <label-inside>{{ translate('cooldown') + ' (' + translate('in-seconds') + ')' }}</label-inside>
              <b-input-group>
                <b-form-input
                  id="name"
                  v-model.number="seconds"
                  type="number"
                  min="0"
                  :state="$v.editationItem.miliseconds.$invalid && $v.editationItem.miliseconds.$dirty ? false : null"
                  @input="$v.editationItem.miliseconds.$touch()"
                />
              </b-input-group>
              <b-form-invalid-feedback :state="!($v.editationItem.miliseconds.$invalid && $v.editationItem.miliseconds.$dirty)">
                {{ translate('dialog.errors.minValue').replace('$value', 0) }}
              </b-form-invalid-feedback>
            </b-form-group>
          </b-form>
        </div>
      </b-sidebar>
      <b-alert
        v-if="fItems.length === 0 && search.length > 0"
        show
        variant="danger"
      >
        <fa icon="search" /> <span v-html="translate('systems.cooldown.emptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="items.length === 0"
        show
      >
        {{ translate('systems.cooldown.empty') }}
      </b-alert>
      <b-table
        v-else
        striped
        small
        hover
        :items="fItems"
        :fields="fields"
        @row-clicked="linkTo($event)"
      >
        <template #cell(miliseconds)="data">
          <span class="font-weight-bold text-primary font-bigger">{{ Number(data.item.miliseconds / 60000).toFixed(1) }}</span> {{ translate('minutes') }}
        </template>
        <template #cell(isErrorMsgQuiet)="data">
          {{ data.item.isErrorMsgQuiet ? translate('commons.yes') : translate('commons.no') }}
        </template>
        <template #cell(isOwnerAffected)="data">
          {{ data.item.isOwnerAffected ? translate('commons.yes') : translate('commons.no') }}
        </template>
        <template #cell(isModeratorAffected)="data">
          {{ data.item.isModeratorAffected ? translate('commons.yes') : translate('commons.no') }}
        </template>
        <template #cell(isSubscriberAffected)="data">
          {{ data.item.isSubscriberAffected ? translate('commons.yes') : translate('commons.no') }}
        </template>
        <template #cell(isFollowerAffected)="data">
          {{ data.item.isFollowerAffected ? translate('commons.yes') : translate('commons.no') }}
        </template>
        <template #cell(buttons)="data">
          <div
            class="float-right"
            style="width: max-content !important;"
          >
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
              :href="'#/manage/cooldowns/edit/' + data.item.id"
            >
              {{ translate('dialog.buttons.edit') }}
            </button-with-icon>
            <button-with-icon
              class="btn-only-icon btn-danger btn-reverse"
              icon="trash"
              @click="del(data.item.id)"
            >
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">

import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, getCurrentInstance, onMounted, ref, watch,
} from '@vue/composition-api';
import { escapeRegExp, isNil } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import { validationMixin } from 'vuelidate';
import {
  minLength, minValue, required,
} from 'vuelidate/lib/validators';

import { CooldownInterface } from 'src/bot/database/entity/cooldown';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { capitalize } from 'src/panel/helpers/capitalize';
import { error } from 'src/panel/helpers/error';

const socket = getSocket('/systems/cooldown');

export default defineComponent({
  components: {
    loading:        () => import('../../components/loading.vue'),
    'label-inside': () => import('src/panel/components/label-inside.vue'),
  },
  filters: {
    capitalize (value: string) {
      if (!value) {
        return '';
      }
      value = value.toString();
      return value.charAt(0).toUpperCase() + value.slice(1);
    },
  },
  mixins:      [ validationMixin ],
  validations: {
    editationItem: {
      name:        { required, minLength: minLength(2) },
      miliseconds: { required, minValue: minValue(0) },
    },
  },
  setup(props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const items = ref([] as CooldownInterface[]);
    const editationItem = ref(null as CooldownInterface | null);
    const search = ref('');
    const state = ref({
      loading: ButtonStates.progress,
      save:    ButtonStates.idle,
      pending: false,
    } as {
      loading: number;
      save: number;
      pending: boolean;
    });

    const fields = [
      {
        key: 'name', label: '!' + translate('command') + ', ' + translate('keyword') + ' ' + translate('or') + ' g:' + translate('group'), sortable: true,
      },
      {
        key:      'miliseconds',
        label:    translate('cooldown'),
        sortable: true,
      },
      {
        key: 'type', label: translate('type'), sortable: true, formatter: (value: string) => translate(value),
      },
      {
        key: 'isErrorMsgQuiet', label: capitalize(translate('quiet')), sortable: true,
      },
      {
        key: 'isOwnerAffected', label: capitalize(translate('core.permissions.casters')), sortable: true,
      },
      {
        key: 'isModeratorAffected', label: capitalize(translate('core.permissions.moderators')), sortable: true,
      },
      {
        key: 'isSubscriberAffected', label: capitalize(translate('core.permissions.subscribers')), sortable: true,
      },
      {
        key: 'isFollowerAffected', label: capitalize(translate('core.permissions.followers')), sortable: true,
      },
      { key: 'buttons', label: '' },
    ];

    const fItems = computed(() => {
      if (search.value.length === 0) {
        return items.value;
      }
      return items.value.filter((o) => {
        const isSearchInKey = !isNil(o.name.match(new RegExp(escapeRegExp(search.value), 'ig')));
        return isSearchInKey;
      });
    });

    onMounted(() => {
      refresh();
      loadEditationItem();
      if (ctx.root.$route.params.id) {
        isSidebarVisible.value = true;
      }
    });

    const newItem = () => {
      ctx.root.$router.push({ name: 'cooldownsManagerEdit', params: { id: uuid() } }).catch(() => {
        return;
      });
    };

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, itemsGetAll: CooldownInterface[]) => {
        if (err) {
          return error(err);
        }
        console.debug('Loaded', items.value);
        items.value = itemsGetAll;
        state.value.loading = ButtonStates.success;
      });
    };

    watch(items, (val) => {
      val.forEach((item) => update(item as Required<CooldownInterface>));
    }, { deep: true });

    watch(() => ctx.root.$route.params.id, (val) => {
      const $v = instance?.$v;
      $v?.$reset();
      if (val) {
        isSidebarVisible.value = true;
      } else {
        state.value.pending = false;
      }
    });
    watch(editationItem, (val, oldVal) => {
      if (val !== null && oldVal !== null) {
        state.value.pending = true;
      }
    }, { deep: true });

    const linkTo = (item: Required<CooldownInterface>) => {
      console.debug('Clicked', item.id);
      ctx.root.$router.push({ name: 'cooldownsManagerEdit', params: { id: item.id } }).catch(() => {
        return;
      });
    };
    const remove = (id: string) => {
      socket.emit('generic::deleteById', id, () => {
        items.value = items.value.filter((o) => o.id !== id);
      });
    };
    const update = (item: Required<CooldownInterface>) => {
      socket.emit('cooldown::save', item , () => {
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
        ctx.root.$router.push({ name: 'cooldownsManager' }).catch(() => {
          return;
        });
      } else {
        state.value.save = ButtonStates.idle;
        if (sidebarSlideEnabled.value) {
          editationItem.value = null;
          loadEditationItem();
        }
      }
    };
    const loadEditationItem = () => {
      if (ctx.root.$route.params.id) {
        socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, data: CooldownInterface) => {
          if (err) {
            return error(err);
          }
          console.debug({ data });
          if (data === null) {
            // we are creating new item
            editationItem.value = {
              id:                   ctx.root.$route.params.id,
              name:                 '',
              miliseconds:          600000,
              type:                 'global',
              timestamp:            0,
              isErrorMsgQuiet:      false,
              isEnabled:            true,
              isOwnerAffected:      true,
              isModeratorAffected:  true,
              isSubscriberAffected: true,
              isFollowerAffected:   true,
            };
          } else {
            editationItem.value = data;
          }
        });
      } else {
        editationItem.value = null;
      }
    };
    const seconds = computed({
      get: () => editationItem.value ? editationItem.value.miliseconds / 1000 : 0,
      set: (value: number) => editationItem.value ? editationItem.value.miliseconds = value * 1000 : false,
    });
    const save = async () => {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;
        await new Promise<void>((resolve, reject) => {
          console.debug('Saving cooldown', editationItem.value);
          socket.emit('cooldown::save', editationItem.value, (err: string | null, data: CooldownInterface) => {
            if (err) {
              state.value.save = ButtonStates.fail;
              reject(error(err));
            } else {
              resolve();
            }
            setTimeout(() => {
              state.value.save = ButtonStates.idle;
            }, 1000);
          });
        });

        state.value.save = ButtonStates.success;
        ctx.root.$nextTick(() => {
          refresh();
          state.value.pending = false;
          ctx.root.$router.push({ name: 'cooldownsManagerEdit', params: { id: editationItem.value?.id || '' } }).catch(err => {
            return;
          });
        });
      }
      setTimeout(() => {
        state.value.save = ButtonStates.idle;
      }, 1000);
    };
    const del = (id: string) => {
      if (confirm('Do you want to delete cooldown ' + items.value.find(o => o.id === id)?.name + '?')) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        });
      }
    };

    return {
      items,
      search,
      state,
      fields,
      linkTo,
      remove,
      update,
      fItems,
      editationItem,
      sidebarSlideEnabled,
      isSidebarVisibleChange,
      isSidebarVisible,
      save,
      newItem,
      seconds,
      del,
      translate,
    };
  },
});
</script>