<template>
  <div class="px-3 py-2">
    <b-form>
      <b-form-group :key="'name' + editationItem.id">
        <label-inside>{{ translate('integrations.obswebsocket.name.name') }}</label-inside>
        <template v-if="editationItem">
          <b-input-group>
            <b-form-input
              id="name"
              v-model="editationItem.name"
              type="text"
              :state="$v.editationItem.name.$invalid && $v.editationItem.name.$dirty ? false : null"
              @input="$v.editationItem.name.$touch()"
            />
          </b-input-group>
          <b-form-invalid-feedback :state="!($v.editationItem.name.$invalid && $v.editationItem.name.$dirty)">
            {{ translate('dialog.errors.required') }}
          </b-form-invalid-feedback>
        </template>
        <b-skeleton
          v-else
          type="input"
          class="w-100"
        />
      </b-form-group>

      <b-form-group :key="'advancedMode' + editationItem.id">
        <b-form-checkbox
          :id="'advancedMode' + editationItem.id"
          v-model="editationItem.advancedMode"
          :name="'advancedMode' + editationItem.id"
          switch
        >
          {{ translate('registry.alerts.enableAdvancedMode') }}
        </b-form-checkbox>
      </b-form-group>

      <div
        v-if="editationItem.advancedMode"
        :key="'advancedModeCode' + editationItem.id"
        class="col-md-12 p-0 pb-2"
      >
        <codemirror
          v-model="editationItem.advancedModeCode"
          style="font-size: 0.8em"
          class="w-100"
          :options="{
            tabSize: 4,
            mode: 'text/javascript',
            theme: 'base16-' + theme,
            lineNumbers: true,
            line: true,
          }"
        />
      </div>
      <template v-else>
        <b-row no-gutters>
          <b-col>
            <title-divider>{{ translate('integrations.obswebsocket.actions') }}</title-divider>
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
                no-caret
              >
                <template #button-content>
                  <fa icon="plus" />
                </template>
                <b-dropdown-item
                  v-for="action of Object.keys(availableActions)"
                  :key="action"
                  @click="addAction(action)"
                >
                  {{ translate('integrations.obswebsocket.' + action + '.name') }}
                </b-dropdown-item>
              </b-dropdown>
            </div>
          </b-col>
        </b-row>
        <b-row
          v-for="(task, index) of editationItem.simpleModeTasks"
          :key="task.id"
          class="p-2"
        >
          <b-col v-if="task.event === 'SetCurrentScene'">
            <b-row style="align-items: flex-end;">
              <b-col>
                <label-inside>{{ translate('integrations.obswebsocket.SetCurrentScene.name') }}</label-inside>
                <b-select
                  v-model="task.args.sceneName"
                  :options="availableScenes"
                >
                  <template #first>
                    <b-select-option
                      value=""
                      disabled
                    >
                      -- {{ translate('integrations.obswebsocket.noSceneSelected') }} --
                    </b-select-option>
                  </template>
                </b-select>
              </b-col>
              <b-col cols="auto">
                <b-btn
                  variant="danger"
                  @click="deleteAction(index)"
                >
                  {{ translate('dialog.buttons.delete') }}
                </b-btn>
              </b-col>
            </b-row>
          </b-col>

          <b-col v-else-if="task.event === 'Log'">
            <b-row style="align-items: flex-end;">
              <b-col>
                <label-inside>{{ translate('integrations.obswebsocket.Log.name') }}</label-inside>
                <b-input v-model.trim="task.args.logMessage" />
              </b-col>
              <b-col cols="auto">
                <b-btn
                  variant="danger"
                  @click="deleteAction(index)"
                >
                  {{ translate('dialog.buttons.delete') }}
                </b-btn>
              </b-col>
            </b-row>
          </b-col>

          <b-col v-else-if="task.event === 'WaitMs'">
            <b-row style="align-items: flex-end;">
              <b-col>
                <label-inside>{{ translate('integrations.obswebsocket.WaitMs.name') }}</label-inside>
                <b-input
                  v-model.number="task.args.miliseconds"
                  type="number"
                  min="0"
                />
              </b-col>
              <b-col cols="auto">
                <b-btn
                  variant="danger"
                  @click="deleteAction(index)"
                >
                  {{ translate('dialog.buttons.delete') }}
                </b-btn>
              </b-col>
            </b-row>
          </b-col>

          <b-col
            v-else-if="
              [ 'StartReplayBuffer', 'StopReplayBuffer', 'SaveReplayBuffer',
                'StartRecording', 'StopRecording', 'PauseRecording', 'ResumeRecording' ].includes(task.event)"
          >
            <b-row style="align-items: center">
              <b-col>
                <label-inside>{{ translate('integrations.obswebsocket.' + task.event + '.name') }}</label-inside>
              </b-col>
              <b-col cols="auto">
                <b-btn
                  variant="danger"
                  @click="deleteAction(index)"
                >
                  {{ translate('dialog.buttons.delete') }}
                </b-btn>
              </b-col>
            </b-row>
          </b-col>

          <b-col v-else-if="task.event === 'SetMute'">
            <b-row style="align-items: flex-end;">
              <b-col>
                <label-inside>{{ translate('integrations.obswebsocket.SetMute.name') }}</label-inside>
                <b-input-group>
                  <b-select
                    v-model="task.args.source"
                    :options="availableAudioSources"
                  >
                    <template #first>
                      <b-select-option
                        value=""
                        disabled
                      >
                        -- {{ translate('integrations.obswebsocket.noSourceSelected') }} --
                      </b-select-option>
                    </template>
                  </b-select>
                  <template #append>
                    <b-btn
                      :variant="task.args.mute ? 'danger' : 'success'"
                      @click="task.args.mute = !task.args.mute"
                    >
                      {{ translate('integrations.obswebsocket.' + (task.args.mute ? 'mute' : 'unmute')) }}
                    </b-btn>
                  </template>
                </b-input-group>
              </b-col>
              <b-col cols="auto">
                <b-btn
                  variant="danger"
                  @click="deleteAction(index)"
                >
                  {{ translate('dialog.buttons.delete') }}
                </b-btn>
              </b-col>
            </b-row>
          </b-col>

          <b-col v-else-if="task.event === 'SetVolume'">
            <b-row style="align-items: flex-end;">
              <b-col>
                <label-inside>{{ translate('integrations.obswebsocket.SetVolume.name') }}</label-inside>
                <b-input-group>
                  <b-select
                    v-model="task.args.source"
                    :options="availableAudioSources"
                  >
                    <template #first>
                      <b-select-option
                        value=""
                        disabled
                      >
                        -- {{ translate('integrations.obswebsocket.noSourceSelected') }} --
                      </b-select-option>
                    </template>
                  </b-select>
                  <template #append>
                    <b-input-group append="dB">
                      <b-input
                        v-model.number="task.args.volume"
                        type="number"
                        min="-100"
                        max="0"
                        step="0.1"
                      />
                    </b-input-group>
                  </template>
                </b-input-group>
              </b-col>
              <b-col cols="auto">
                <b-btn
                  variant="danger"
                  @click="deleteAction(index)"
                >
                  {{ translate('dialog.buttons.delete') }}
                </b-btn>
              </b-col>
            </b-row>
          </b-col>

          <b-col v-else>
            <b-row style="align-items: flex-end;">
              <b-col>Unknown task <em>{{ task.event }}</em></b-col>
              <b-col cols="auto">
                <b-btn
                  variant="danger"
                  @click="deleteAction(index)"
                >
                  {{ translate('dialog.buttons.delete') }}
                </b-btn>
              </b-col>
            </b-row>
          </b-col>
        </b-row>
      </template>
    </b-form>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, getCurrentInstance,  onMounted, onUnmounted, ref, watch,
} from '@vue/composition-api';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/lib/codemirror.css';
import { cloneDeep, get } from 'lodash-es';
import type ObsWebSocket from 'obs-websocket-js';
import shortid from 'shortid';
import { codemirror } from 'vue-codemirror';
import { validationMixin } from 'vuelidate';
import { minLength, required } from 'vuelidate/lib/validators';

import advancedModeCode from 'src/bot/data/templates/obswebsocket-code.txt';
import type { OBSWebsocketInterface } from 'src/bot/database/entity/obswebsocket';
import { availableActions } from 'src/bot/helpers/obswebsocket/actions';
import type { Source, Type } from 'src/bot/helpers/obswebsocket/sources';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { capitalize } from 'src/panel/helpers/capitalize';
import { error } from 'src/panel/helpers/error';
import { EventBus } from 'src/panel/helpers/event-bus';

const socket = getSocket('/integrations/obswebsocket');

type Props = {
  id: string;
  invalid: boolean;
  pending: boolean;
};

export default defineComponent({
  components: {
    codemirror,
    'label-inside':  () => import('src/panel/components/label-inside.vue'),
    'title-divider': () => import('src/panel/components/title-divider.vue'),
  },
  mixins: [ validationMixin ],
  props:  {
    id:      String,
    invalid: Boolean,
    pending: Boolean,
  },
  validations: { editationItem: { name: { required, minLength: minLength(1) } } },
  setup(props: Props, ctx) {
    const instance = getCurrentInstance()?.proxy;
    const theme = localStorage.getItem('theme') || get(ctx.root.$store.state, 'configuration.core.ui.theme', 'light');
    const availableScenes = ref([] as { value: string; text: string }[]);
    const availableSources = ref([] as Source[]);
    const sourceTypes = ref([] as Type[]);
    let interval = 0;

    const availableAudioSources = computed(() => {
      const audioTypeId = sourceTypes.value.filter(type => type.caps.hasAudio).map(type => type.typeId);
      return availableSources.value
        .filter(source => audioTypeId.includes(source.typeId))
        .map(source => ({ value: source.name, text: source.name }));
    });

    const editationItem = ref({
      id:              ctx.root.$route.params.id || shortid.generate(),
      name:            '',
      advancedMode:    false,
      advancedModeCode,
      simpleModeTasks: [],
    } as OBSWebsocketInterface);

    const state = ref({ loading: ButtonStates.progress } as {
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

    onUnmounted(() => {
      clearInterval(interval);
    });

    onMounted(() => {
      loadEditationItem();
      refreshScenes();
      interval = window.setInterval(() => {
        refreshScenes();
        refreshSources();
      }, 1000);

      ctx.emit('update:pending', false);
      EventBus.$on('registry::obswebsocket::save::' + editationItem.value.id, () => {
        console.debug('Save event received - registry::obswebsocket::save::' + editationItem.value.id);
        save();
      });
      EventBus.$on('registry::obswebsocket::test::' + editationItem.value.id, () => {
        console.debug('Test event received - registry::obswebsocket::test::' + editationItem.value.id);
        ctx.emit('update:testState', ButtonStates.progress);
        socket.emit('integration::obswebsocket::test',
          editationItem.value.advancedMode
            ? editationItem.value.advancedModeCode
            : editationItem.value.simpleModeTasks, (err: string | null) => {
            if (err) {
              ctx.emit('update:testState', ButtonStates.fail);
              error(err);
            } else {
              ctx.emit('update:testState', ButtonStates.success);
            }
            setTimeout(() => {
              ctx.emit('update:testState', ButtonStates.idle);
            }, 1000);
          });
      });
    });
    onUnmounted(() => {
      EventBus.$off('registry::obswebsocket::save::' + editationItem.value.id);
    });
    const loadEditationItem = async () => {
      state.value.loading = ButtonStates.progress;
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          if (ctx.root.$route.params.id) {
            socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, itemGetAll: Required<OBSWebsocketInterface> | undefined) => {
              if (err) {
                reject(error(err));
              }
              if (!itemGetAll) {
                editationItem.value = {
                  id:              ctx.root.$route.params.id,
                  name:            '',
                  advancedMode:    false,
                  advancedModeCode,
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
          state.value.loading = ButtonStates.success;
        }, 100);
      });
    };

    const addActionRegex = /\(obs,\ (?<arguments>.*?)\)/;
    const addAction = (actionKey: keyof typeof availableActions) => {
      const match = addActionRegex.exec(availableActions[actionKey].toString());
      const argsList = match?.groups?.arguments.split(',').map(o => o.trim()) || [];
      const args = argsList.reduce((prev, cur) => {
        let value: number|string|boolean = '';
        switch(cur) {
          case 'miliseconds':
            value = 1000;
            break;
          case 'mute':
            value = false;
            break;
          case 'volume':
            value = 0;
            break;
          case 'useDecibel':
            value = true;
            break;
        }
        return { [cur]: value, ...prev };
      }, {});
      editationItem.value.simpleModeTasks.push({
        id:    shortid.generate(),
        event: actionKey,
        args:  args as any,
      });
    };

    const refreshSources = () => {
      socket.emit('integration::obswebsocket::listSources', (err: string | null, sources: any, types: any) => {
        if (err) {
          console.error(err);
        } else {
          availableSources.value = sources;
          sourceTypes.value = types;
        }
      });
    };

    const refreshScenes = () => {
      socket.emit('integration::obswebsocket::listScene', (err: string | null, listScene: ObsWebSocket.Scene[]) => {
        if (err) {
          console.error(err);
        } else {
          availableScenes.value = listScene.map((scene) => {
            return {
              value: scene.name,
              text:  scene.name,
            };
          });
        }
      });
    };

    const save = () =>  {
      const $v = instance?.$v;
      $v?.$touch();
      ctx.emit('update:invalid', (!!$v?.$error));
      if (!$v?.$error) {
        ctx.emit('update:saveState', ButtonStates.progress);
        socket.emit('generic::setById', { id: editationItem.value.id, item: editationItem.value }, (err: string | null, data: OBSWebsocketInterface) => {
          if (err) {
            ctx.emit('update:saveState', ButtonStates.fail);
            error(err);
          } else {
            console.groupCollapsed('generic::setById');
            console.log({ data });
            console.groupEnd();
            ctx.emit('update:saveState', ButtonStates.success);
          }
          ctx.emit('update:pending', false);
          ctx.emit('refresh');
          setTimeout(() => {
            ctx.emit('update:saveState', ButtonStates.idle);
          }, 1000);
        });
      }
    };

    const deleteAction = (idx: number) => {
      if (editationItem.value) {
        editationItem.value.simpleModeTasks.splice(idx, 1);
      }
    };

    return {
      state,
      save,
      addAction,
      deleteAction,

      editationItem,

      translate,
      capitalize,
      ButtonStates,
      get,
      theme,

      availableScenes,
      availableSources,
      availableActions,
      availableAudioSources,
      sourceTypes,
    };
  },
});
</script>
