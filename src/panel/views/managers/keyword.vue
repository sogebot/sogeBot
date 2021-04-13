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
          {{ translate('menu.keywords') }}
        </span>
      </b-col>
      <b-col
        v-if="!$systems.find(o => o.name === 'keywords').enabled"
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
      @showAs="showAs = $event"
    >
      <template #left>
        <button-with-icon
          class="btn-primary btn-reverse"
          icon="plus"
          @click="newItem"
        >
          {{ translate('systems.keywords.new') }}
        </button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loadedCmd === 1 || state.loadedPerm === 1" />
    <template v-else>
      <b-sidebar
        :visible="isSidebarVisible"
        :no-slide="!sidebarSlideEnabled"
        width="1200px"
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
              <label-inside>{{ translate('systems.keywords.keyword.name') }}</label-inside>
              <template v-if="editationItem">
                <b-input-group>
                  <b-form-input
                    id="name"
                    v-model="editationItem.keyword"
                    type="text"
                    :placeholder="translate('systems.keywords.keyword.placeholder')"
                    :state="$v.editationItem.keyword.$invalid && $v.editationItem.keyword.$dirty ? false : null"
                    @input="$v.editationItem.keyword.$touch()"
                  />
                </b-input-group>
                <b-form-invalid-feedback :state="!($v.editationItem.keyword.$invalid && $v.editationItem.keyword.$dirty)">
                  <template v-if="!$v.editationItem.keyword.isValidRegex">
                    {{ translate('errors.invalid_regexp_format') }}
                  </template>
                  <template v-else>
                    {{ translate('dialog.errors.required') }}
                  </template>
                </b-form-invalid-feedback>
              </template>
              <b-skeleton
                v-else
                type="input"
                class="w-100"
              />
            </b-form-group>

            <b-form-group>
              <template v-if="editationItem">
                <b-alert
                  v-if="editationItem.responses.length === 0"
                  show
                >
                  {{ translate('systems.customcommands.no-responses-set') }}
                </b-alert>
                <b-row
                  v-for="(response, i) of orderBy(editationItem.responses, 'order', 'asc')"
                  :key="updatedAt + '' + i"
                  no-gutters
                  :class="[i !== 0 ? 'pt-2' : '']"
                >
                  <b-col>
                    <title-divider>{{ translate('systems.keywords.response.name') }} {{ i+1 }}</title-divider>
                  </b-col>
                  <b-col
                    md="auto"
                    sm="12"
                    align-self="end"
                    class="text-right"
                  >
                    <div
                      class="h-auto w-auto"
                      style="flex-shrink: 0;"
                    >
                      <b-dropdown
                        variant="outline-dark"
                        toggle-class="border-0 h-auto w-auto"
                        class="h-100"
                      >
                        <template #button-content>
                          <fa
                            class="mr-1"
                            icon="key"
                          />
                          <span
                            v-if="getPermissionName(response.permission, permissions)"
                          >{{ getPermissionName(response.permission, permissions) }}</span>
                          <span
                            v-else
                            class="text-danger"
                          >
                            <fa icon="exclamation-triangle" />Permission not found
                          </span>
                        </template>
                        <b-dropdown-item
                          v-for="p of permissions"
                          :key="p.id"
                          @click="response.permission = p.id; state.pending = true;"
                        >
                          {{ getPermissionName(p.id, permissions) | capitalize }}
                        </b-dropdown-item>
                      </b-dropdown>
                      <b-dropdown
                        variant="outline-dark"
                        toggle-class="border-0 h-auto w-auto"
                        class="h-100"
                      >
                        <template #button-content>
                          <fa
                            class="mr-1"
                            :icon="response.stopIfExecuted ? 'stop' : 'play'"
                          />
                          {{ translate(response.stopIfExecuted ? 'commons.stop-if-executed' : 'commons.continue-if-executed') | capitalize }}
                        </template>
                        <b-dropdown-item
                          @click="response.stopIfExecuted = true; state.pending = true"
                        >
                          {{ translate('commons.stop-if-executed') | capitalize }}
                        </b-dropdown-item>
                        <b-dropdown-item
                          @click="response.stopIfExecuted = false; state.pending = true"
                        >
                          {{ translate('commons.continue-if-executed') | capitalize }}
                        </b-dropdown-item>
                      </b-dropdown>
                      <b-dropdown
                        variant="outline-dark"
                        toggle-class="border-0 h-auto w-auto"
                        class="h-100"
                        no-caret
                      >
                        <template #button-content>
                          <fa icon="ellipsis-v" />
                        </template>
                        <b-dropdown-item
                          v-if="i !== 0"
                          @click="moveUpResponse(response.order)"
                        >
                          <fa
                            icon="sort-up"
                            fixed-width
                          />
                          {{ translate('commons.moveUp') | capitalize }}
                        </b-dropdown-item>
                        <b-dropdown-item
                          v-if="i !== editationItem.responses.length - 1"
                          @click="moveDownResponse(response.order)"
                        >
                          <fa
                            icon="sort-down"
                            fixed-width
                          />
                          {{ translate('commons.moveDown') | capitalize }}
                        </b-dropdown-item>
                        <b-dropdown-item @click="deleteResponse(response.order)">
                          <fa
                            icon="trash-alt"
                            fixed-width
                          />
                          {{ translate('delete') }}
                        </b-dropdown-item>
                      </b-dropdown>
                    </div>
                  </b-col>

                  <b-col
                    cols="12"
                    sm="8"
                    md="9"
                  >
                    <label-inside>{{ translate('systems.keywords.response.name') }}</label-inside>
                    <textarea-with-tags
                      :value.sync="response.response"
                      :placeholder="translate('systems.keywords.response.placeholder')"
                      :filters="['global', 'sender', 'param', '!param', 'touser']"
                      :state="true"
                      @update="response.response = $event"
                    />
                  </b-col>
                  <b-col
                    cols="12"
                    sm="4"
                    md="3"
                  >
                    <label-inside>{{ translate('systems.keywords.filter.name') }}</label-inside>
                    <textarea-with-tags
                      :value.sync="response.filter"
                      :placeholder="translate('systems.keywords.filter.placeholder')"
                      :filters="['sender', 'source', 'param', 'haveParam', 'is.moderator', 'is.subscriber', 'is.vip', 'is.follower', 'is.broadcaster', 'is.bot', 'is.owner', 'rank', 'game', 'language', 'title', 'views', 'followers', 'subscribers', 'isBotSubscriber']"
                      :state="true"
                      @update="response.filter = $event"
                    />
                  </b-col>
                </b-row>
                <button
                  class="btn btn-primary btn-block mt-2"
                  type="button"
                  @click="editationItem.responses.push({ filter: '', order: editationItem.responses.length, response: '', stopIfExecuted: false, permission: orderBy(permissions, 'order', 'asc').pop().id })"
                >
                  {{ translate('systems.keywords.addResponse') }}
                </button>
              </template>
              <b-skeleton
                v-else
                type="input"
                class="w-100"
                style="height: 600px !important"
              />
            </b-form-group>
          </b-form>
        </div>
      </b-sidebar>
      <b-alert
        v-if="keywordsFiltered.length === 0 && search.length > 0"
        show
        variant="danger"
      >
        <fa icon="search" /> <span v-html="translate('systems.keywords.emptyAfterSearch').replace('$search', search)" />
      </b-alert>
      <b-alert
        v-else-if="keywords.length === 0"
        show
      >
        {{ translate('systems.keywords.empty') }}
      </b-alert>
      <b-table
        v-else
        striped
        small
        :items="keywordsFiltered"
        :fields="fields"
        responsive
        :sort-by="'keyword'"
      >
        <template #cell(response)="data">
          <span
            v-if="data.item.responses.length === 0"
            class="text-muted"
          >{{ translate('systems.keywords.no-responses-set') }}</span>
          <template v-for="(r, i) of orderBy(data.item.responses, 'order', 'asc')">
            <div
              :key="i"
              :style="{ 'margin-top': i !== 0 ? '15px' : 'inherit' }"
              style="margin: 0; font-size: 11px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; margin-bottom: -3px;"
            >
              <span style="display: inline-block">
                {{ translate('response') }}#{{ i + 1 }}
              </span>

              <span style="display: inline-block">
                <b-dropdown
                  variant="outline-dark"
                  toggle-class="border-0"
                  size="sm"
                >
                  <template #button-content>
                    <fa
                      class="mr-1"
                      icon="key"
                    />
                    <span v-if="getPermissionName(r.permission, permissions)">{{ getPermissionName(r.permission, permissions) }}</span>
                    <span
                      v-else
                      class="text-danger"
                    ><fa icon="exclamation-triangle" /> Permission not found</span>
                  </template>
                  <b-dropdown-item
                    v-for="p of permissions"
                    :key="p.id"
                    @click="updatePermission(data.item.id, r.id, p.id)"
                  >
                    {{ getPermissionName(p.id, permissions) | capitalize }}
                  </b-dropdown-item>
                </b-dropdown>
              </span>

              <span style="display: inline-block">
                <b-dropdown
                  variant="outline-dark"
                  toggle-class="border-0"
                  size="sm"
                >
                  <template #button-content>
                    <fa
                      class="mr-1"
                      :icon="r.stopIfExecuted ? 'stop' : 'play'"
                    />
                    {{ translate(r.stopIfExecuted ? 'commons.stop-if-executed' : 'commons.continue-if-executed') | capitalize }}
                  </template>
                  <b-dropdown-item @click="updateStopIfExecuted(data.item.id, r.id, true)">
                    {{ translate('commons.stop-if-executed') | capitalize }}
                  </b-dropdown-item>
                  <b-dropdown-item @click="updateStopIfExecuted(data.item.id, r.id, false)">
                    {{ translate('commons.continue-if-executed') | capitalize }}
                  </b-dropdown-item>
                </b-dropdown>
              </span>
            </div>
            <text-with-tags
              v-if="r.filter"
              :key="10 + i"
              :value="r.filter"
              style="font-size: .8rem;border: 1px dashed #eee; display: inline-block;padding: 0.1rem; padding-left: 0.3rem; padding-right: 0.3rem;"
            />
            <text-with-tags
              :key="100 + i"
              :value="r.response"
              style="display: inline-block"
            />
          </template>
        </template>
        <template #cell(buttons)="data">
          <div
            class="float-right"
            style="width: max-content !important;"
          >
            <button-with-icon
              :class="[ data.item.enabled ? 'btn-success' : 'btn-danger' ]"
              class="btn-only-icon btn-reverse"
              icon="power-off"
              @click="data.item.enabled = !data.item.enabled; sendUpdate(data.item.id)"
            >
              {{ translate('dialog.buttons.' + (data.item.enabled? 'enabled' : 'disabled')) }}
            </button-with-icon>
            <button-with-icon
              class="btn-only-icon btn-primary btn-reverse"
              icon="edit"
              :href="'#/manage/keywords/edit/' + data.item.id"
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

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faExclamationTriangle, faEye, faEyeSlash, faKey, faPlay, faStop,
} from '@fortawesome/free-solid-svg-icons';
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, getCurrentInstance, onMounted, ref, watch,
} from '@vue/composition-api';
import { isNil, orderBy } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import { validationMixin } from 'vuelidate';
import { minLength, required } from 'vuelidate/lib/validators';
import XRegExp from 'xregexp';

import type { KeywordInterface } from 'src/bot/database/entity/keyword';
import type { PermissionsInterface } from 'src/bot/database/entity/permissions';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';

import { getPermissionName } from '../../helpers/getPermissionName';

library.add(faEye, faEyeSlash, faExclamationTriangle, faPlay, faKey, faStop);

const socket = {
  permission: getSocket('/core/permissions'),
  keyword:    getSocket('/systems/keywords'),
} as const;
const isValidRegex = (val: string) => {
  try {
    XRegExp(val);
    return true;
  } catch (e) {
    error(e);
    return false;
  }
};

export default defineComponent({
  components: {
    loading:          () => import('../../components/loading.vue'),
    'text-with-tags': () => import('../../components/textWithTags.vue'),
    'title-divider':  () => import('src/panel/components/title-divider.vue'),
    'label-inside':   () => import('src/panel/components/label-inside.vue'),
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
      keyword: {
        required,
        minLength: minLength(2),
        isValidRegex,
      },
    },
  },
  setup(props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const search = ref('');
    const keywords = ref([] as Required<KeywordInterface>[]);
    const permissions = ref([] as Required<PermissionsInterface>[]);
    const editationItem = ref(null as KeywordInterface | null);
    const isDataChanged = ref(false);
    const updatedAt = ref(Date.now());
    const state = ref({
      loadedPerm: ButtonStates.progress,
      loadedCmd:  ButtonStates.progress,
      save:       ButtonStates.idle,
      pending:    false,
    } as {
      loadedPerm: number;
      loadedCmd: number;
      save: number;
      pending: boolean;
    });

    const keywordsFiltered = computed(() => {
      if (search.value.length === 0) {
        return keywords.value;
      }
      return keywords.value.filter((o) => {
        const isSearchInKeyword = !isNil(o.keyword.match(new RegExp(search.value, 'ig')));
        const isSearchInResponse = o.responses.filter(o2 => {
          return !isNil(o2.response.match(new RegExp(search.value, 'ig')));
        }).length > 0;
        return isSearchInKeyword || isSearchInResponse;
      });
    });

    const fields = [
      {
        key: 'keyword', label: translate('keyword'), sortable: true,
      },
      { key: 'response', label: translate('response') },
      { key: 'buttons', label: '' },
    ];

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

    const refresh = () => {
      socket.permission.emit('permissions', (err: string | null, data: Readonly<Required<PermissionsInterface>>[]) => {
        if(err) {
          return error(err);
        }
        permissions.value = data;
        state.value.loadedPerm = ButtonStates.success;
      });
      socket.keyword.emit('generic::getAll', (err: string | null, keywordsGetAll: Required<KeywordInterface>[] ) => {
        if (err) {
          return error(err);
        }
        console.debug({ keywords });
        keywords.value = keywordsGetAll;
        state.value.loadedCmd = ButtonStates.success;
      });
    };

    onMounted(() => {
      refresh();
      loadEditationItem();
      if (ctx.root.$route.params.id) {
        isSidebarVisible.value = true;
      }
    });

    const updatePermission = (cid: string, rid: string, permission: string) => {
      const keyword = keywords.value.filter((o) => o.id === cid)[0];
      const response = keyword.responses.filter((o) => o.id === rid)[0];
      response.permission = permission;
      socket.keyword.emit('generic::setById', { id: cid, item: keyword }, () => {
        return;
      });
      ctx.root.$forceUpdate();
    };
    const updateStopIfExecuted = (cid: string, rid: string, stopIfExecuted: boolean) => {
      const keyword = keywords.value.filter((o) => o.id === cid)[0];
      const response = keyword.responses.filter((o) => o.id === rid)[0];
      response.stopIfExecuted = stopIfExecuted;
      socket.keyword.emit('generic::setById', { id: cid, item: keyword }, () => {
        return;
      });
      ctx.root.$forceUpdate();
    };
    const newItem = () => {
      ctx.root.$router.push({ name: 'KeywordsManagerEdit', params: { id: uuid() } }).catch(() => {
        return;
      });
    };
    const sendUpdate = (id: string) => {
      socket.keyword.emit('generic::setById', { id, item: keywords.value.find((o) => o.id === id) }, (err: string | null) => {
        if (err) {
          return error(err);
        }
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
        ctx.root.$router.push({ name: 'KeywordsManagerList' }).catch(() => {
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
        socket.keyword.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, data: KeywordInterface) => {
          if (err) {
            return error(err);
          }
          console.debug({ data });
          if (data === null) {
            // we are creating new item
            editationItem.value = {
              id:        ctx.root.$route.params.id,
              keyword:   '',
              enabled:   true,
              responses: [],
            };
          } else {
            editationItem.value = data;
          }
        });
      } else {
        editationItem.value = null;
      }
    };
    const save = async () => {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;
        await new Promise<void>((resolve, reject) => {
          console.debug('Saving keyword', editationItem.value);
          socket.keyword.emit('generic::setById', { id: editationItem.value?.id, item: editationItem.value }, (err: string | null) => {
            if (err) {
              state.value.save = ButtonStates.fail;
              reject(error(err));
            }
            resolve();
          });
        });

        state.value.save = ButtonStates.success;
        ctx.root.$nextTick(() => {
          refresh();
          state.value.pending = false;
          ctx.root.$router.push({ name: 'KeywordsManagerEdit', params: { id: editationItem.value?.id || '' } }).catch(err => {
            return;
          });
        });
      }
      setTimeout(() => {
        state.value.save = ButtonStates.idle;
      }, 1000);
    };
    const del = (id: string) => {
      if (confirm('Do you want to delete custom keyword ' + keywords.value.find(o => o.id === id)?.keyword + '?')) {
        socket.keyword.emit('generic::deleteById', id, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        });
      }
    };
    const deleteResponse = (order: number) => {
      if (editationItem.value?.responses) {
        editationItem.value.responses.splice(editationItem.value.responses.findIndex(o => o.order === order), 1);
        orderBy(editationItem.value.responses, 'order', 'asc').map((o, i) => {
          o.order = i;
          return o;
        });
        updatedAt.value = Date.now();
      }
    };
    const moveUpResponse = (order: number) => {
      if (editationItem.value) {
        editationItem.value.responses?.forEach(o => {
          if (o.order === order - 1) {
            o.order++;
          } else if (o.order === order) {
            o.order--;
          }
        });
      }
      updatedAt.value = Date.now();
    };
    const moveDownResponse = (order: number) => {
      if (editationItem.value) {
        editationItem.value.responses?.forEach(o => {
          if (o.order === order + 1) {
            o.order--;
          } else if (o.order === order) {
            o.order++;
          }
        });
      }
      updatedAt.value = Date.now();
    };

    return {
      orderBy,
      search,
      keywords,
      state,
      updatedAt,
      isDataChanged,
      permissions,
      keywordsFiltered,
      fields,
      sendUpdate,
      updatePermission,
      updateStopIfExecuted,
      getPermissionName,
      editationItem,
      sidebarSlideEnabled,
      isSidebarVisibleChange,
      isSidebarVisible,
      save,
      newItem,
      del,
      deleteResponse,
      moveUpResponse,
      moveDownResponse,
      translate,
    };
  },
});
</script>
