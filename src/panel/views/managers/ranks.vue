<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.ranks') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'ranks').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" @click="newItem">{{translate('systems.ranks.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success"/>
    <template v-else>
      <b-sidebar
        @change="isSidebarVisibleChange"
        :visible="isSidebarVisible"
        :no-slide="!sidebarSlideEnabled"
        width="600px"
        no-close-on-route-change
        shadow
        no-header
        right
        backdrop>
        <template v-slot:footer="{ hide }">
          <div class="d-flex bg-opaque align-items-center px-3 py-2 border-top border-gray" style="justify-content: flex-end">
            <b-button class="mx-2" @click="hide" variant="link">{{ translate('dialog.buttons.close') }}</b-button>
            <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid && !!$v.$dirty"/>
          </div>
        </template>
        <div class="px-3 py-2">
          <loading v-if="!editationItem" />
          <b-form v-else>
            <b-form-group
              :label="translate('rank')"
              label-for="name"
            >
              <b-input-group>
                <b-form-input
                  id="name"
                  v-model="editationItem.rank"
                  type="text"
                  @input="$v.editationItem.rank.$touch()"
                  :state="$v.editationItem.rank.$invalid && $v.editationItem.rank.$dirty ? false : null"
                ></b-form-input>
              </b-input-group>
              <b-form-invalid-feedback :state="!($v.editationItem.rank.$invalid && $v.editationItem.rank.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
            </b-form-group>

            <b-form-group
              :label="translate('type')"
              label-for="type"
            >
              <b-form-select v-model="editationItem.type" class="mb-3">
                <b-form-select-option value="viewer">Watch Time</b-form-select-option>
                <b-form-select-option value="follower">Follow time</b-form-select-option>
                <b-form-select-option value="subscriber">Sub time</b-form-select-option>
              </b-form-select>
            </b-form-group>

            <b-form-group
              :label="editationItem.type === 'viewer' ? translate('hours') : translate('months')"
              label-for="name"
            >
              <b-input-group>
                <b-form-input
                  id="name"
                  v-model.number="editationItem.value"
                  type="number"
                  min="0"
                  @input="$v.editationItem.value.$touch()"
                  :state="$v.editationItem.value.$invalid && $v.editationItem.value.$dirty ? false : null"
                ></b-form-input>
              </b-input-group>
              <b-form-invalid-feedback :state="!($v.editationItem.value.$invalid && $v.editationItem.value.$dirty)">{{ translate('dialog.errors.minValue').replace('$value', 0) }}</b-form-invalid-feedback>
            </b-form-group>
          </b-form>
        </div>
      </b-sidebar>
      <b-row>
        <b-col md="4" sm="12">
          <span class="title"><small>Watch time</small></span>
          <b-table striped small hover :items="fViewerItems" :fields="fields" @row-clicked="linkTo($event)" show-empty>
            <template v-slot:empty>
              <b-alert show variant="danger" class="m-0" v-if="search.length > 0"><fa icon="search"/> <span v-html="translate('systems.ranks.emptyAfterSearch').replace('$search', search)"/></b-alert>
              <b-alert show class="m-0" v-else>{{translate('systems.ranks.empty')}}</b-alert>
            </template>
            <template v-slot:cell(value)="data">
              <span class="font-weight-bold text-primary font-bigger">{{ data.item.value }}</span>
            </template>
            <template v-slot:cell(buttons)="data">
              <div class="float-right" style="width: max-content !important;">
                <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/ranks/edit/' + data.item.id">
                  {{ translate('dialog.buttons.edit') }}
                </button-with-icon>
                <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(data.item.id)">
                  {{ translate('dialog.buttons.delete') }}
                </button-with-icon>
              </div>
            </template>
          </b-table>
        </b-col>
        <b-col md="4" sm="12">
          <span class="title"><small>Follow time</small></span>
          <b-table striped small hover :items="fFollowerItems" :fields="fields2" @row-clicked="linkTo($event)" show-empty>
            <template v-slot:empty>
              <b-alert show variant="danger" class="m-0" v-if="search.length > 0"><fa icon="search"/> <span v-html="translate('systems.ranks.emptyAfterSearch').replace('$search', search)"/></b-alert>
              <b-alert show class="m-0" v-else>{{translate('systems.ranks.empty')}}</b-alert>
            </template>
            <template v-slot:cell(value)="data">
              <span class="font-weight-bold text-primary font-bigger">{{ data.item.value }}</span>
            </template>
            <template v-slot:cell(buttons)="data">
              <div class="float-right" style="width: max-content !important;">
                <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/ranks/edit/' + data.item.id">
                  {{ translate('dialog.buttons.edit') }}
                </button-with-icon>
                <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(data.item.id)">
                  {{ translate('dialog.buttons.delete') }}
                </button-with-icon>
              </div>
            </template>
          </b-table>
        </b-col>
        <b-col md="4" sm="12">
          <span class="title"><small>Sub time</small></span>
          <b-table striped small hover :items="fSubscriberItems" :fields="fields2" @row-clicked="linkTo($event)" show-empty>
            <template v-slot:empty>
              <b-alert show variant="danger" class="m-0" v-if="search.length > 0"><fa icon="search"/> <span v-html="translate('systems.ranks.emptyAfterSearch').replace('$search', search)"/></b-alert>
              <b-alert show class="m-0" v-else>{{translate('systems.ranks.empty')}}</b-alert>
            </template>
            <template v-slot:cell(value)="data">
              <span class="font-weight-bold text-primary font-bigger">{{ data.item.value }}</span>
            </template>
            <template v-slot:cell(buttons)="data">
              <div class="float-right" style="width: max-content !important;">
                <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/ranks/edit/' + data.item.id">
                  {{ translate('dialog.buttons.edit') }}
                </button-with-icon>
                <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(data.item.id)">
                  {{ translate('dialog.buttons.delete') }}
                </button-with-icon>
              </div>
            </template>
          </b-table>
        </b-col>
      </b-row>
    </template>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, getCurrentInstance, computed, watch } from '@vue/composition-api'
import { getSocket } from 'src/panel/helpers/socket';
import { capitalize } from 'src/panel/helpers/capitalize';
import { validationMixin } from 'vuelidate'
import { v4 as uuid } from 'uuid';

import { isNil } from 'lodash-es';
import { escape } from 'xregexp';
import { RankInterface } from 'src/bot/database/entity/rank';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import translate from 'src/panel/helpers/translate';
import { error } from 'src/panel/helpers/error';
import { minValue, required } from 'vuelidate/lib/validators';

const socket = getSocket('/systems/ranks');

export default defineComponent({
  mixins: [ validationMixin ],
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  },
  validations: {
    editationItem: {
      rank: {required},
      value: {required, minValue: minValue(0)},
    }
  },
  setup(props, ctx) {
    const instance = getCurrentInstance();
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const items = ref([] as RankInterface[]);
    const editationItem = ref(null as RankInterface | null);
    const search = ref('');

    const state = ref({
      loading: ButtonStates.progress,
      save: ButtonStates.idle,
      pending: false,
    } as {
      loading: number;
      save: number;
      pending: boolean;
    });

    const fields = [
      { key: 'value', label: capitalize(translate('hours')), sortable: true },
      { key: 'rank', label: translate('rank'), sortable: true },
      { key: 'buttons', label: '' },
    ];

    const fields2 = [
      { key: 'value', label: capitalize(translate('months')), sortable: true },
      { key: 'rank', label: translate('rank'), sortable: true },
      { key: 'buttons', label: '' },
    ];

    const fViewerItems = computed(() => {
      if (search.value.length === 0) {
        return items.value.filter((o) => o.type === 'viewer');
      }
      return items.value.filter((o) => {
        const isViewer = o.type === 'viewer';
        const isSearchInHours = !isNil(String(o.value).match(new RegExp(escape(search.value), 'ig')))
        const isSearchInValue = !isNil(o.rank.match(new RegExp(escape(search.value), 'ig')))
        return isViewer && (isSearchInHours || isSearchInValue);
      })
    });
    const fFollowerItems = computed(() => {
      if (search.value.length === 0) {
        return items.value.filter((o) => o.type === 'follower');
      }
      return items.value.filter((o) => {
        const isFollower = o.type === 'follower';
        const isSearchInHours = !isNil(String(o.value).match(new RegExp(escape(search.value), 'ig')))
        const isSearchInValue = !isNil(o.rank.match(new RegExp(escape(search.value), 'ig')))
        return isFollower && (isSearchInHours || isSearchInValue);
      })
    })
    const fSubscriberItems = computed(() => {
      if (search.value.length === 0) {
        return items.value.filter((o) => o.type === 'subscriber');
      }
      return items.value.filter((o) => {
        const isSubscriber = o.type === 'subscriber';
        const isSearchInHours = !isNil(String(o.value).match(new RegExp(escape(search.value), 'ig')))
        const isSearchInValue = !isNil(o.rank.match(new RegExp(escape(search.value), 'ig')))
        return isSubscriber && (isSearchInHours || isSearchInValue);
      })
    })

    watch(() => ctx.root.$route.params.id, (val) => {
      const $v = instance?.$v;
      $v?.$reset();
      if (val) {
        isSidebarVisible.value = true;
      } else {
        state.value.pending = false;
      }
    })
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

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, itemsSocket: RankInterface[]) => {
        if (err) {
          return error(err);
        }
        console.debug('Loaded', items)
        items.value = itemsSocket;
        state.value.loading = ButtonStates.success;
      })
    }

    const linkTo = (item: Required<RankInterface>) => {
      console.debug('Clicked', item.id);
      ctx.root.$router.push({ name: 'RanksManagerEdit', params: { id: item.id } });
    }

    const del = (id: string) => {
      if (confirm('Do you want to delete rank ' + items.value.find(o => o.id === id)?.rank + ' ('+items.value.find(o => o.id === id)?.value+')?')) {
        socket.emit('ranks::remove', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        })
      }
    }

    const save = () =>  {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;

        socket.emit('ranks::save', editationItem.value, (err: string | null, data: RankInterface) => {
          if (err) {
            state.value.save = ButtonStates.fail;
            return error(err);
          } else {
            console.groupCollapsed('generic::setById')
            console.log({data})
            console.groupEnd();
            state.value.save = ButtonStates.success;
            ctx.root.$nextTick(() => {
              refresh();
              state.value.pending = false;
              ctx.root.$router.push({ name: 'RanksManagerEdit', params: { id: String(data.id) } }).catch(() => {});
            });
          }
          setTimeout(() => {
            state.value.save = ButtonStates.idle;
          }, 1000)
        });
      }
    }
    const isSidebarVisibleChange = (isVisible: boolean, ev: any) => {
      if (!isVisible) {
        if (state.value.pending) {
          const isOK = confirm('You will lose your pending changes. Do you want to continue?')
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
        ctx.root.$router.push({ name: 'RanksManagerList' }).catch(() => {});
      } else {
        if (sidebarSlideEnabled.value) {
          editationItem.value = null
          loadEditationItem();
        }
      }
    }
    const loadEditationItem = () => {
      if (ctx.root.$route.params.id) {
        socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, data: RankInterface) => {
          if (err) {
            return error(err);
          }
          console.debug({data})
          if (data === null) {
            // we are creating new item
            editationItem.value = {
              id: ctx.root.$route.params.id,
              value: 20,
              rank: '',
              type: 'viewer'
            }
          } else {
            editationItem.value = data;
          }
        })
      } else {
        editationItem.value = null;
      }
    }
    const newItem = () => {
      ctx.root.$router.push({ name: 'RanksManagerEdit', params: { id: uuid() } }).catch(() => {});
    };

    return {
      state,
      linkTo,
      editationItem,
      sidebarSlideEnabled,
      isSidebarVisibleChange,
      isSidebarVisible,
      save,
      newItem,
      del,
      search,
      fields,
      fields2,
      fViewerItems,
      fFollowerItems,
      fSubscriberItems,
    }
  }
})
</script>