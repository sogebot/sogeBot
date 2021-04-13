<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right" /></small>
          {{ translate('menu.price') }}
        </span>
      </b-col>
      <b-col
        v-if="!$systems.find(o => o.name === 'price').enabled"
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
          {{ translate('systems.price.new') }}
        </button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === 1" />
    <template v-else>
      <b-sidebar
        :visible="isSidebarVisible"
        :no-slide="!sidebarSlideEnabled"
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
        <div class="px-3 py-2">
          <b-form>
            <b-form-group>
              <label-inside>{{ translate('systems.price.command.name') }}</label-inside>
              <b-input-group>
                <b-form-input
                  v-if="editationItem"
                  id="command"
                  v-model="editationItem.command"
                  type="text"
                  :placeholder="translate('systems.price.command.placeholder')"
                  :state="$v.editationItem.command.$invalid && $v.editationItem.command.$dirty ? false : null"
                  @input="$v.editationItem.command.$touch()"
                />
                <b-skeleton
                  v-else
                  type="input"
                  class="w-100"
                />
              </b-input-group>
              <b-form-invalid-feedback :state="!($v.editationItem.command.$invalid && $v.editationItem.command.$dirty)">
                {{ translate('dialog.errors.required') }}
              </b-form-invalid-feedback>
            </b-form-group>

            <b-form-group>
              <label-inside>{{ translate('systems.price.price.name') }}</label-inside>
              <b-input-group>
                <b-input-group-text
                  slot="append"
                  class="pr-3 pl-3"
                >
                  {{ getLocalizedName(editationItem ? editationItem.price : 0, $store.state.configuration.systems.Points.customization.name) }}
                </b-input-group-text>
                <b-form-input
                  v-if="editationItem"
                  id="price"
                  v-model.number="editationItem.price"
                  type="number"
                  min="0"
                  :placeholder="translate('systems.price.price.placeholder')"
                  :state="$v.editationItem.price.$invalid && $v.editationItem.price.$dirty ? false : null"
                  @input="$v.editationItem.price.$touch()"
                />
                <b-skeleton
                  v-else
                  type="input"
                  class="w-100"
                />
              </b-input-group>
              <b-form-invalid-feedback :state="!($v.editationItem.price.$invalid && $v.editationItem.price.$dirty)">
                <template v-if="$v.editationItem.priceBits.oneValueIsAboveZero">
                  {{ translate('dialog.errors.minValue').replace('$value', '1') }}
                </template>
              </b-form-invalid-feedback>
              <div class="text-muted text-center">
                {{ translate('or') }}
              </div>
              <b-input-group>
                <b-input-group-text
                  slot="append"
                  class="pr-3 pl-3"
                >
                  {{ getLocalizedName(editationItem ? editationItem.priceBits : 0, translate('bot.bits')) }}
                </b-input-group-text>
                <b-form-input
                  v-if="editationItem"
                  id="priceBits"
                  v-model.number="editationItem.priceBits"
                  type="number"
                  min="0"
                  :placeholder="translate('systems.price.priceBits.placeholder')"
                  :state="$v.editationItem.priceBits.$invalid && $v.editationItem.priceBits.$dirty ? false : null"
                  @input="$v.editationItem.priceBits.$touch()"
                />
                <b-skeleton
                  v-else
                  type="input"
                  class="w-100"
                />
              </b-input-group>
              <b-form-checkbox
                v-if="editationItem && editationItem.priceBits > 0"
                id="emitRedeemEvent"
                v-model="editationItem.emitRedeemEvent"
                name="emitRedeemEvent"
              >
                {{ translate('systems.price.emitRedeemEvent') }}
              </b-form-checkbox>
              <b-form-invalid-feedback :state="!($v.editationItem.priceBits.$invalid && $v.editationItem.priceBits.$dirty)">
                <template v-if="!$v.editationItem.priceBits.oneValueIsAboveZero">
                  {{ translate('errors.one_of_inputs_must_be_set') }}
                </template>
                <template v-else>
                  {{ translate('dialog.errors.minValue').replace('$value', '0') }}
                </template>
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
        <fa icon="search" /> <span v-html="translate('systems.price.emptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="items.length === 0"
        show
      >
        {{ translate('systems.price.empty') }}
      </b-alert>
      <b-table
        v-else
        hover
        striped
        small
        :items="fItems"
        :fields="fields"
        sort-by="command"
        @row-clicked="linkTo($event)"
      >
        <template #cell(price)="data">
          <div v-html="priceFormatter(data.item)" />
        </template>
        <template #cell(emitRedeemEvent)="data">
          <div v-if="data.item.emitRedeemEvent && data.item.priceBits > 0">
            <fa
              icon="check"
              fixed-width
            /> {{ translate('systems.price.emitRedeemEvent') }}
          </div>
          <div
            v-else-if="data.item.priceBits > 0"
            class="text-muted"
          >
            <fa
              icon="times"
              fixed-width
            /> {{ translate('systems.price.emitRedeemEvent') }}
          </div>
        </template>

        <template #cell(buttons)="data">
          <div class="text-right">
            <button-with-icon
              :class="[ data.item.enabled ? 'btn-success' : 'btn-danger' ]"
              class="btn-only-icon btn-reverse"
              icon="power-off"
              @click="data.item.enabled = !data.item.enabled; update(data.item)"
            >
              {{ translate('dialog.buttons.' + (data.item.enabled? 'enabled' : 'disabled')) }}
            </button-with-icon>
            <button-with-icon
              class="btn-only-icon btn-primary btn-reverse"
              icon="edit"
              :href="'#/manage/price/edit/' + data.item.id"
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
import { capitalize, isNil } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import { validationMixin } from 'vuelidate';
import { minValue, required } from 'vuelidate/lib/validators';

import type { PriceInterface } from 'src/bot/database/entity/price';
import { getLocalizedName } from 'src/bot/helpers/getLocalized';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';

const socket = getSocket('/systems/price');
export default defineComponent({
  components: {
    'loading':      () => import('src/panel/components/loading.vue'),
    'label-inside': () => import('src/panel/components/label-inside.vue'),
  },
  mixins:      [ validationMixin ],
  validations: {
    editationItem: {
      command: { required },
      price:   {
        minValue:            minValue(0),
        required,
        oneValueIsAboveZero: (value, vm) => {
          return vm ? value + vm.priceBits > 0 : true;
        },
      },
      priceBits: {
        minValue:            minValue(0),
        required,
        oneValueIsAboveZero: (value, vm) => {
          return vm ? value + vm.price > 0 : true;
        },
      },
    },
  },
  setup(props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);
    const search = ref('');
    const items = ref([] as PriceInterface[]);
    const editationItem = ref(null as PriceInterface | null);
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
        key: 'command', label: capitalize(translate('systems.price.command.name')), sortable: true,
      },
      { key: 'price', label: capitalize(translate('systems.price.price.name')) },
      { key: 'emitRedeemEvent', label: '' },
      { key: 'buttons', label: '' },
    ];
    const priceFormatter = (item: PriceInterface) => {
      const output = [];
      if (item.price !== 0) {
        output.push(`${item.price} ${getLocalizedName(item.price, ctx.root.$store.state.configuration.systems.Points.customization.name)}`);
      }
      if (item.priceBits !== 0) {
        output.push(`${item.priceBits} ${getLocalizedName(item.priceBits, translate('bot.bits'))}`);
      }
      return output.join(` <small class="text-muted text-center">${translate('or')}</small> `);
    };
    const fItems = computed(() => {
      if (search.value.length === 0) {
        return items.value;
      }
      return items.value.filter((o) => {
        const isSearchInPrice = !isNil(o.command.match(new RegExp(search.value, 'ig')));
        return isSearchInPrice;
      });
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
    watch(editationItem, (val, oldVal) => {
      if (val !== null && oldVal !== null) {
        state.value.pending = true;
      }
    }, { deep: true });

    onMounted(() => {
      refresh();
      loadEditationItem();
      if (ctx.root.$route.params.id) {
        isSidebarVisible.value = true;
      }
    });

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
        ctx.root.$router.push({ name: 'PriceManager' }).catch(() => {
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

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, itemsGetAll: PriceInterface[]) => {
        if (err) {
          return error(err);
        }
        items.value = itemsGetAll;
        console.debug({ items: itemsGetAll });
        state.value.loading = ButtonStates.success;
      });
    };
    const loadEditationItem = () => {
      if (ctx.root.$route.params.id) {
        socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, data: PriceInterface) => {
          if (err) {
            return error(err);
          }
          console.debug({ data });
          if (data === null) {
            // we are creating new item
            editationItem.value = {
              command:         '',
              price:           10,
              priceBits:       0,
              id:              ctx.root.$route.params.id,
              enabled:         true,
              emitRedeemEvent: false,
            };
          } else {
            editationItem.value = data;
          }
        });
      } else {
        editationItem.value = null;
      }
    };
    const update = (item: PriceInterface) => {
      socket.emit('price::save', item, (err: string | null) => {
        if (err) {
          return error(err);
        }
      });
    };
    const del = (id: string) => {
      if (confirm('Do you want to delete price for ' + items.value.find(o => o.id === id)?.command + '?')) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        });
      }
    };
    const newItem = () => {
      ctx.root.$router.push({ name: 'PriceManagerEdit', params: { id: uuid() } }).catch(() => {
        return;
      });
    };
    const linkTo = (item: Required<PriceInterface>) => {
      console.debug('Clicked', item.id);
      ctx.root.$router.push({ name: 'PriceManagerEdit', params: { id: item.id } }).catch(() => {
        return;
      });
    };
    const save = () => {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;

        socket.emit('price::save', editationItem.value, (err: string | null) => {
          if (err) {
            state.value.save = ButtonStates.fail;
            return error(err);
          }

          state.value.save = ButtonStates.success;
          ctx.root.$nextTick(() => {
            refresh();
            state.value.pending = false;
            ctx.root.$router.push({ name: 'PriceManagerEdit', params: { id: String(editationItem.value?.id) } }).catch(() => {
              return;
            });
          });
          setTimeout(() => {
            state.value.save = ButtonStates.idle;
          }, 1000);
        });
      }
    };

    return {
      search,
      items,
      state,
      fields,
      isSidebarVisible,
      fItems,
      update,
      del,
      linkTo,
      isSidebarVisibleChange,
      editationItem,
      save,
      sidebarSlideEnabled,
      newItem,
      getLocalizedName,
      priceFormatter,
      translate,
    };
  },
});
</script>
