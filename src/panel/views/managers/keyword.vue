<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.keywords') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'keywords').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" @click="newItem">{{translate('systems.keywords.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === 1"/>
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
          <b-form>
            <b-form-group
              :label="translate('systems.keywords.keyword.name')"
              label-for="keyword"
            >
              <template v-if="editationItem">
                <b-form-input
                  id="keyword"
                  v-model="editationItem.keyword"
                  type="text"
                  :placeholder="translate('systems.keywords.keyword.placeholder')"
                  :state="$v.editationItem.keyword.$invalid && $v.editationItem.keyword.$dirty ? false : null"
                  @input="$v.editationItem.keyword.$touch()"
                ></b-form-input>
                <b-form-invalid-feedback :state="!($v.editationItem.keyword.$invalid && $v.editationItem.keyword.$dirty)">
                  <template v-if="!$v.editationItem.keyword.isValidRegex">{{ translate('errors.invalid_regexp_format') }}</template>
                  <template v-else>{{ translate('dialog.errors.required') }}</template>
                </b-form-invalid-feedback>
              </template>
              <b-skeleton v-else type="input" class="w-100"></b-skeleton>
              <small class="form-text text-muted" v-html="translate('systems.keywords.keyword.help')"></small>
            </b-form-group>
            <b-form-group
              :label="translate('systems.keywords.response.name')"
              label-for="response"
            >
              <template v-if="editationItem">
                <b-form-textarea
                  id="response"
                  v-model="editationItem.response"
                  :placeholder="translate('systems.keywords.response.placeholder')"
                  :state="$v.editationItem.response.$invalid && $v.editationItem.response.$dirty ? false : null"
                  rows="8"
                  @input="$v.editationItem.response.$touch()"
                ></b-form-textarea>
                <b-form-invalid-feedback :state="!($v.editationItem.response.$invalid && $v.editationItem.response.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
              </template>
              <b-skeleton v-else type="input" class="w-100" style="height: 600px !important"></b-skeleton>
            </b-form-group>
          </b-form>
        </div>
      </b-sidebar>
      <b-alert show variant="danger" v-if="fItems.length === 0 && search.length > 0">
        <fa icon="search"/> <span v-html="translate('systems.keywords.emptyAfterSearch').replace('$search', search)"/>
      </b-alert>
      <b-alert show v-else-if="items.length === 0">
        {{translate('systems.keywords.empty')}}
      </b-alert>
      <b-table v-else striped small hover :items="fItems" :fields="fields" @row-clicked="linkTo($event)">
        <template v-slot:cell(buttons)="data">
          <div class="text-right">
            <button-with-icon :class="[ data.item.enabled ? 'btn-success' : 'btn-danger' ]" class="btn-only-icon btn-reverse" icon="power-off" @click="data.item.enabled = !data.item.enabled; update(data.item)">
              {{ translate('dialog.buttons.' + (data.item.enabled? 'enabled' : 'disabled')) }}
            </button-with-icon>
            <button-with-icon class="btn-only-icon btn-primary btn-reverse" icon="edit" v-bind:href="'#/manage/keywords/edit/' + data.item.id">
              {{ translate('dialog.buttons.edit') }}
            </button-with-icon>
            <button-with-icon class="btn-only-icon btn-danger btn-reverse" icon="trash" @click="del(data.item.id)">
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </template>
      </b-table>
    </template>
  </b-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch, getCurrentInstance } from '@vue/composition-api'
import { getSocket } from 'src/panel/helpers/socket';
import { validationMixin } from 'vuelidate'

import { KeywordInterface } from 'src/bot/database/entity/keyword';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import translate from 'src/panel/helpers/translate';
import { error } from 'src/panel/helpers/error';

import { v4 as uuid } from 'uuid';
import { required } from 'vuelidate/lib/validators';

const socket = getSocket('/systems/keywords');
const isValidRegex = (val: string) => {
  try {
    new RegExp(val);
    return true;
  } catch (e) {
    return false;
  }
}

export default defineComponent({
  mixins: [ validationMixin ],
  components: {
    'loading': () => import('src/panel/components/loading.vue'),
  },
  validations: {
    editationItem: {
      keyword: { required, isValidRegex },
      response: { required },
    }
  },
  setup(props, ctx) {
    const instance = getCurrentInstance();
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);
    const items = ref([] as KeywordInterface[]);
    const editationItem = ref(null as KeywordInterface | null);
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
      { key: 'keyword', label: translate('systems.keywords.keyword.name'), sortable: true },
      { key: 'response', label: translate('systems.keywords.response.name'), sortable: true },
      { key: 'buttons', label: '' },
    ];

    const fItems = computed(() => {
      return items.value
        .filter((o) => {
          if (search.value.trim() === '') {
            return true;
          }
          return o.keyword.trim().toLowerCase().includes(search.value.trim().toLowerCase())
        })
        .sort((a, b) => {
          const A = a.keyword.toLowerCase();
          const B = b.keyword.toLowerCase();
          if (A < B)  { //sort string ascending
            return -1;
          }
          if (A > B) {
            return 1;
          }
          return 0; //default return value (no sorting)
        })
    });

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
      socket.emit('generic::getAll', (err: string | null, data: KeywordInterface[]) => {
        if (err) {
          return error(err);
        }
        items.value = data;
        state.value.loading = ButtonStates.success;
      })
    }
    const del = (id: string) => {
      if (confirm('Do you want to delete keyword ' + items.value.find(o => o.id === id)?.keyword + '?')) {
        socket.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        })
      }
    }
    const update = (keyword: KeywordInterface) => {
      socket.emit('keywords::save', keyword, () => {});
    }
    const linkTo = (item: Required<KeywordInterface>) => {
      console.debug('Clicked', item.id);
      ctx.root.$router.push({ name: 'KeywordsManagerEdit', params: { id: item.id } }).catch(() => {});
    }
    const newItem = () => {
      ctx.root.$router.push({ name: 'KeywordsManagerEdit', params: { id: uuid() } }).catch(() => {});
    };
    const save = () => {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;
        socket.emit('keywords::save', editationItem.value, (err: string | null, data: KeywordInterface) => {
          if (err) {
            state.value.save = ButtonStates.fail;
            return error(err);
          }

          state.value.save = ButtonStates.success;
          ctx.root.$nextTick(() => {
            refresh();
            state.value.pending = false;
            ctx.root.$router.push({ name: 'KeywordsManagerEdit', params: { id: String(data.id) } }).catch(() => {});
          });
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
        ctx.root.$router.push({ name: 'KeywordsManager' }).catch(() => {});
      } else {
        if (sidebarSlideEnabled.value) {
          editationItem.value = null
          loadEditationItem();
        }
      }
    }
    const loadEditationItem = () => {
      if (ctx.root.$route.params.id) {
        socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, data: KeywordInterface) => {
          if (err) {
            return error(err);
          }
          console.debug({data})
          if (data === null) {
            // we are creating new item
            editationItem.value = {
              id: ctx.root.$route.params.id,
              keyword: '',
              response: '',
              enabled: true,
            }
          } else {
            editationItem.value = data;
          }
        })
      } else {
        editationItem.value = null;
      }
    }

    return {
      items,
      search,
      state,
      fields,
      fItems,
      del,
      update,
      linkTo,
      editationItem,
      save,
      sidebarSlideEnabled,
      newItem,
      isSidebarVisible,
      isSidebarVisibleChange,
    }
  }
});
</script>

<style scoped>
</style>
