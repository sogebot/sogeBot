<template>
  <div class="px-3 py-2">
    <b-form>
      <b-form-group :key="'name' + editationItem.id">
        <label-inside>{{ translate('registry.obswebsocket.name.name') }}</label-inside>
        <template v-if="editationItem">
          <b-input-group>
            <b-form-input
              id="name"
              v-model="editationItem.name"
              type="text"
              :placeholder="translate('registry.obswebsocket.name.placeholder')"
              @input="$v.editationItem.name.$touch()"
              :state="$v.editationItem.name.$invalid && $v.editationItem.name.$dirty ? false : null"
            ></b-form-input>
          </b-input-group>
          <b-form-invalid-feedback :state="!($v.editationItem.name.$invalid && $v.editationItem.name.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
        </template>
        <b-skeleton v-else type="input" class="w-100"></b-skeleton>
      </b-form-group>

      <b-form-group :key="'advancedMode' + editationItem.id">
        <b-form-checkbox :id="'advancedMode' + editationItem.id" v-model="editationItem.advancedMode" :name="'advancedMode' + editationItem.id" switch>
          {{ translate('registry.alerts.enableAdvancedMode') }}
        </b-form-checkbox>
      </b-form-group>

      <div class="col-md-12 p-0 pb-2" v-if="editationItem.advancedMode" :key="'advancedModeCode' + editationItem.id">
        <codemirror style="font-size: 0.8em;" class="w-100" v-model="editationItem.advancedModeCode" :options="{
          tabSize: 4,
          mode: 'text/javascript',
          theme: 'base16-' + theme,
          lineNumbers: true,
          line: true,
        }"></codemirror>
      </div>
      <template v-else>
        <b-row no-gutters>
          <b-col>
            <title-divider>{{ translate('registry.obswebsocket.event') }}</title-divider>
          </b-col>
          <b-col md="auto" sm="12" align-self="end" class="text-right">
            <div class="h-auto w-auto" style="flex-shrink: 0;">
              <b-dropdown
                variant="outline-dark"
                toggle-class="border-0 h-auto w-auto"
                class="h-100"
                no-caret
              >
                <template v-slot:button-content>
                  <fa icon="plus"></fa>
                </template>
                <b-dropdown-item v-for="action of Object.keys(availableActions)" @click="addAction(action)" :key="action">
                  {{ translate('registry.obswebsocket.actions.' + action) }}
                </b-dropdown-item>
              </b-dropdown>
            </div>
          </b-col>
        </b-row>
        <b-row v-for="task of editationItem.simpleModeTasks" :key="task.id" class="p-2">
          <b-col v-if="task.event === 'SetCurrentScene'">
            <label-inside>{{translate('registry.obswebsocket.SetCurrentScene.name')}}</label-inside>
            <b-select v-model="task.args.sceneName" :options="availableScenes">
              <template #first>
                <b-select-option value="" disabled>-- {{translate('registry.obswebsocket.noSceneSelected')}} --</b-select-option>
              </template>
            </b-select>
          </b-col>
          <b-col v-else-if="task.event === 'WaitMs'">
            <label-inside>{{translate('registry.obswebsocket.WaitMs.name')}}</label-inside>
            <b-input v-model.number="task.args.miliseconds"/>
          </b-col>
          <b-col v-else>
            Unknown task <em>{{task.name}}</em>
          </b-col>
        </b-row>
      </template>
    </b-form>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted,  watch, getCurrentInstance, onUnmounted } from '@vue/composition-api'
import translate from 'src/panel/helpers/translate';
import shortid from 'shortid';

import { codemirror } from 'vue-codemirror';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/lib/codemirror.css';

import { getSocket } from 'src/panel/helpers/socket';
import type { OBSWebsocketInterface } from 'src/bot/database/entity/obswebsocket';

import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { capitalize } from 'src/panel/helpers/capitalize';
import { availableActions } from 'src/bot/helpers/obswebsocket';

import { validationMixin } from 'vuelidate'
import { minLength, required } from 'vuelidate/lib/validators'
import { cloneDeep, get } from 'lodash-es';
import { EventBus } from 'src/panel/helpers/event-bus';
import ObsWebSocket from 'obs-websocket-js';

const socket = getSocket('/integrations/obswebsocket');

type Props = {
  id: string;
  invalid: boolean;
  pending: boolean;
}

export default defineComponent({
  props: {
    id: String,
    invalid: Boolean,
    pending: Boolean,
  },
  mixins: [ validationMixin ],
  components: {
    codemirror,
    loading: () => import('src/panel/components/loading.vue'),
    'label-inside': () => import('src/panel/components/label-inside.vue'),
    'title-divider': () => import('src/panel/components/title-divider.vue')
  },
  validations: {
    editationItem: {
      name: { required, minLength: minLength(1) },
    }
  },
  setup(props: Props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const theme = localStorage.getItem('theme') || get(ctx.root.$store.state, 'configuration.core.ui.theme', 'light');
    const availableScenes = ref([] as { value: string; text: string }[])

    const editationItem = ref({
      id: ctx.root.$route.params.id || shortid.generate(),
      name: '',
      advancedMode: false,
      advancedModeCode: '',
      simpleModeTasks: [],
    } as OBSWebsocketInterface);

    const state = ref({
      loading: ButtonStates.progress,
    } as {
      loading: number;
    });

    watch(editationItem, (val, oldVal) => {
      if (state.value.loading !== ButtonStates.progress) {
        ctx.emit('update:pending', true);

        const $v = instance?.$v;
        if ($v) {
          ctx.emit('update:invalid', $v.editationItem.name?.$error && $v.editationItem.name.$dirty);
        }
      }
    }, { deep: true });

    onMounted(() => {
      loadEditationItem();
      refreshScenes(true);
      ctx.emit('update:pending', false);
      EventBus.$on('registry::obswebsocket::save::' + editationItem.value.id, () => {
        console.debug('Save event received - registry::obswebsocket::save::' + editationItem.value.id);
        save();
      });
      EventBus.$on('registry::obswebsocket::test::' + editationItem.value.id, () => {
        console.debug('Test event received - registry::obswebsocket::test::' + editationItem.value.id);
        ctx.emit('update:testState', ButtonStates.progress);
        socket.emit('integration::obswebsocket::test', editationItem.value.simpleModeTasks, (err: string | null) => {
          if (err) {
            ctx.emit('update:testState', ButtonStates.fail);
            error(err)
          } else {
            ctx.emit('update:testState', ButtonStates.success);
          }
          setTimeout(() => {
            ctx.emit('update:testState', ButtonStates.idle);
          }, 1000)
        })
      });
    });
    onUnmounted(() => {
      EventBus.$off('registry::obswebsocket::save::' + editationItem.value.id);
    })
    const loadEditationItem = async () => {
      state.value.loading = ButtonStates.progress
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          if (ctx.root.$route.params.id) {
            socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, itemGetAll: Required<OBSWebsocketInterface> | undefined) => {
              if (err) {
                reject(error(err));
              }
              if (!itemGetAll) {
                editationItem.value = {
                  id: ctx.root.$route.params.id,
                  name: '',
                  advancedMode: false,
                  advancedModeCode: '',
                  simpleModeTasks: [],
                };
                resolve();
                return;
              }

              editationItem.value = cloneDeep(itemGetAll);

              console.debug('Loaded', itemGetAll);
              ctx.root.$nextTick(() => {
                ctx.emit('update:pending', false);
              });
              resolve();
            });
          }
          resolve();
        }),
      ]);
      ctx.root.$nextTick(() => {
        ctx.emit('update:pending', false);
        setTimeout(() => {
          state.value.loading = ButtonStates.success
        }, 100)
      });
    }

    const addActionRegex = /\(obs,\ (?<arguments>.*?)\)/;
    const addAction = (actionKey: keyof typeof availableActions) => {
      const match = addActionRegex.exec(availableActions[actionKey].toString());
      const argsList = match?.groups?.arguments.split(',').map(o => o.trim()) || [];
      const args = argsList.reduce((prev, cur) => {
        let value: number|string = '';
        switch(cur) {
          case 'miliseconds':
            value = 1000;
            break;
        }
          return { [cur]: value, ...prev }
      }, {});
      editationItem.value.simpleModeTasks.push({
        id: shortid.generate(),
        event: actionKey,
        args: args as any,
      })
      if (actionKey === 'SetCurrentScene') {
        refreshScenes();
      }
    }

    const refreshScenes = (isQuiet = false) => {
      socket.emit('integration::obswebsocket::listScene', (err: string | null, listScene: ObsWebSocket.Scene[]) => {
        if (err) {
          if (!isQuiet) {
            error(err)
          }
        } else {
          availableScenes.value = listScene.map((scene) => {
            return {
              value: scene.name,
              text: scene.name,
            }
          })
        }
      })
    }

    const save = () =>  {
      const $v = instance?.$v;
      $v?.$touch();
      ctx.emit('update:invalid', (!!$v?.$error));
      if (!$v?.$error) {
        ctx.emit('update:saveState', ButtonStates.progress);
        socket.emit('generic::setById', { id: editationItem.value.id, item: editationItem.value }, (err: string | null, data: OBSWebsocketInterface) => {
          if (err) {
            ctx.emit('update:saveState', ButtonStates.fail);
            error(err)
          } else {
            console.groupCollapsed('generic::setById')
            console.log({data})
            console.groupEnd();
            ctx.emit('update:saveState', ButtonStates.success);
          }
          ctx.emit('update:pending', false);
          ctx.emit('refresh');
          setTimeout(() => {
            ctx.emit('update:saveState', ButtonStates.idle);
          }, 1000)
        })
      }
    }

    return {
      state,
      save,
      addAction,

      editationItem,

      translate,
      capitalize,
      ButtonStates,
      get,
      theme,

      availableScenes,
      availableActions,
    }
  }
})
</script>
