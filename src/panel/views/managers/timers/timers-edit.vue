<template>
  <div class="px-3 py-2">
    <b-form>
      <b-form-group
        :label="translate('timers.dialog.name')"
        :description="translate('timers.dialog.placeholders.name')"
        label-for="name"
      >
        <b-input-group>
          <b-form-input
            id="name"
            v-model="item.name"
            type="text"
            :placeholder="translate('timers.dialog.placeholders.name')"
            :state="$v.item.name.$invalid && $v.item.name.$dirty ? false : null"
            @input="$v.item.$touch()"
          />
        </b-input-group>
        <b-form-invalid-feedback :state="!($v.item.name.$invalid && $v.item.name.$dirty)">
          {{ translate('timers.errors.timer_name_must_be_compliant') }}
        </b-form-invalid-feedback>
      </b-form-group>

      <b-form-group>
        <b-form-checkbox
          id="tickOffline"
          v-model="item.tickOffline"
          name="tickOffline"
          :value="true"
          :unchecked-value="false"
        >
          {{ translate('timers.dialog.tickOffline') }}
        </b-form-checkbox>
      </b-form-group>

      <b-row>
        <b-col>
          <b-form-group
            :label="translate('timers.dialog.messages')"
            :description="translate('timers.dialog.placeholders.messages')"
            label-for="messages"
          >
            <b-input-group>
              <b-form-input
                id="messages"
                v-model="item.triggerEveryMessage"
                type="number"
                min="0"
                :placeholder="translate('timers.dialog.placeholders.messages')"
                :state="$v.item.triggerEveryMessage.$invalid && $v.item.triggerEveryMessage.$dirty ? false : null"
                @input="$v.item.$touch()"
              />
              <b-form-invalid-feedback :state="!($v.item.triggerEveryMessage.$invalid && $v.item.triggerEveryMessage.$dirty)">
                <template v-if="!$v.item.triggerEveryMessage.required">
                  {{ translate('errors.value_cannot_be_empty') }}
                </template>
                <template v-else-if="!$v.item.triggerEveryMessage.minValue">
                  {{ translate('errors.minValue_of_value_is').replace('$value', '0') }}
                </template>
              </b-form-invalid-feedback>
            </b-input-group>
          </b-form-group>
        </b-col>
        <b-col>
          <b-form-group
            :label="translate('timers.dialog.seconds')"
            :description="translate('timers.dialog.placeholders.seconds')"
            label-for="seconds"
          >
            <b-input-group>
              <b-form-input
                id="seconds"
                v-model="item.triggerEverySecond"
                type="number"
                min="1"
                :placeholder="translate('timers.dialog.placeholders.seconds')"
                :state="$v.item.triggerEverySecond.$invalid && $v.item.triggerEverySecond.$dirty ? false : null"
                @input="$v.item.$touch()"
              />
              <b-form-invalid-feedback :state="!($v.item.triggerEverySecond.$invalid && $v.item.triggerEverySecond.$dirty)">
                <template v-if="!$v.item.triggerEverySecond.required">
                  {{ translate('errors.value_cannot_be_empty') }}
                </template>
                <template v-else-if="!$v.item.triggerEverySecond.minValue">
                  {{ translate('errors.minValue_of_value_is').replace('$value', '1') }}
                </template>
              </b-form-invalid-feedback>
            </b-input-group>
          </b-form-group>
        </b-col>
      </b-row>

      <b-form-group>
        <label>{{ translate('timers.dialog.responses') }}</label>
        <b-input-group
          v-for="(response, index) of item.messages"
          :key="response"
          class="pb-1"
        >
          <b-alert
            v-if="markToDeleteIdx.includes(index)"
            show
            variant="danger"
            style="position: absolute;
                 z-index: 9;
                 height: 100%;
                 width: calc(100% - 34.5px);
                 opacity: 60%;"
          />
          <b-input-group-prepend>
            <b-button
              :variant="response.isEnabled ? 'success' : 'danger'"
              @click="response.isEnabled = !response.isEnabled"
            >
              {{ response.isEnabled ? translate('enabled') : translate('disabled') }}
            </b-button>
          </b-input-group-prepend>

          <textarea-with-tags
            class="w-50"
            :value.sync="response.response"
            :filters="['global']"
            :placeholder="''"
            :state="!(getMessageValidation(index).$error && getMessageValidation(index).$dirty)"
            @input="getMessageValidation(index).$touch();"
          />

          <b-input-group-append>
            <button-with-icon
              class="btn-only-icon btn-danger btn-reverse"
              icon="trash"
              @click="toggleMarkResponse(index)"
            >
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </b-input-group-append>
        </b-input-group>
        <button
          type="button"
          class="btn btn-success btn-block"
          @click="addResponse()"
        >
          {{ translate('systems.timers.add_response') }}
        </button>
      </b-form-group>
    </b-form>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  defineComponent, getCurrentInstance, onMounted, onUnmounted, ref, watch,
} from '@vue/composition-api';
import { get, xor } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import { validationMixin } from 'vuelidate';
import { minValue, required } from 'vuelidate/lib/validators';

import { TimerInterface, TimerResponseInterface } from 'src/bot/database/entity/timer';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { EventBus } from 'src/panel/helpers/event-bus';

type Props = {
  id: string;
  invalid: boolean;
  pending: boolean;
  saveState: number;
};

const mustBeCompliant = (value: string) => value.length === 0 || !!value.match(/^[a-zA-Z0-9_]+$/);
const socket = getSocket('/systems/timers');

export default defineComponent({
  components: { 'textarea-with-tags': () => import('../../../components/textareaWithTags.vue') },
  mixins:     [ validationMixin ],
  props:      {
    id:        String,
    invalid:   Boolean,
    pending:   Boolean,
    saveState: Number,
  },
  validations: {
    item: {
      name:                { mustBeCompliant, required },
      triggerEverySecond:  { required, minValue: minValue(1) },
      triggerEveryMessage: { required, minValue: minValue(0) },
      messages:            { $each: { response: { required } } },
    },
  },
  setup (props: Props, ctx) {
    const instance = getCurrentInstance()?.proxy;

    const markToDeleteIdx = ref([] as number[]);
    const state = ref({ loading: ButtonStates.progress } as {
      loading: number;
    });

    const item = ref({
      id:                   ctx.root.$route.params.id || uuid(),
      name:                 '',
      triggerEveryMessage:  0,
      tickOffline:          false,
      triggerEverySecond:   60,
      isEnabled:            true,
      triggeredAtTimestamp: Date.now(),
      triggeredAtMessages:  0,
      messages:             [],
    } as Required<TimerInterface>);

    watch([item, markToDeleteIdx], (val, oldVal) => {
      if (state.value.loading !== ButtonStates.progress) {
        ctx.emit('update:pending', true);

        const $v = instance?.$v;
        if ($v) {
          ctx.emit('update:invalid', ($v.item.$error && $v.item.$dirty) || stateOfMessagesErrorsDirty());
        }
      }
    }, { deep: true });

    onMounted(() => {
      loadEditationItem();
      ctx.emit('update:pending', false);
      EventBus.$on('managers::timers::save::' + item.value.id, () => {
        console.debug('Save event received - managers::timers::save::' + item.value.id);
        save();
      });
    });
    onUnmounted(() => {
      EventBus.$off('managers::timers::save::' + item.value.id);
    });

    const loadEditationItem = async () => {
      state.value.loading = ButtonStates.progress;
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          if (ctx.root.$route.params.id) {
            socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, timerGetAll: Required<TimerInterface> | undefined) => {
              if (err) {
                reject(error(err));
              }
              if (timerGetAll) {
                console.debug('Loaded', timerGetAll);
                item.value = timerGetAll;
              }
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
        state.value.loading = ButtonStates.success;
      });
    };
    const save = () =>  {
      const $v = instance?.$v;
      $v?.$touch();
      ctx.emit('update:invalid', ($v?.item.name?.$error && $v.item.name.$dirty) || stateOfMessagesErrorsDirty());
      if (!$v?.$error) {
        ctx.emit('update:saveState', ButtonStates.progress);
        const messages: typeof item.value.messages = [];
        item.value.messages.forEach((message, index) => {
          if (!markToDeleteIdx.value.includes(index)) {
            messages.push(message);
          }
        });
        const toSave = {
          ...item.value,
          messages,
        } as Required<TimerInterface>;

        socket.emit('timers::save', toSave, (err: string | null) => {
          if (err) {
            ctx.emit('update:saveState', ButtonStates.fail);
            error(err);
          } else {
            item.value = toSave;
            markToDeleteIdx.value = [];
            ctx.emit('update:saveState', ButtonStates.success);
          }
          ctx.root.$nextTick(() => {
            ctx.emit('update:pending', false);
            ctx.emit('refresh');
            setTimeout(() => {
              ctx.emit('update:saveState', ButtonStates.idle);
            }, 1000);
          });
        });
      }
    };
    const addResponse = () => {
      const response: TimerResponseInterface = {
        id:        uuid(),
        timestamp: Date.now(),
        isEnabled: true,
        response:  '',
      };
      item.value.messages.push(response);
    };

    const toggleMarkResponse = (index: number) => {
      markToDeleteIdx.value = xor(markToDeleteIdx.value, [index]);
    };

    const getMessageValidation = (idx: number) => {
      const $v = instance?.$v;
      return get($v, 'item.messages.$each[' + idx + '].response', {
        $error: false, $dirty: false, $touch: () => {
          return;
        },
      });
    };
    const stateOfMessagesErrorsDirty = () => {
      const $v = instance?.$v;
      return Object.values($v?.item.messages?.$each.$iter ?? []).filter((o, idx) => {
        return !markToDeleteIdx.value.includes(idx) && (!!o.$error && !!o.$dirty);
      }).length > 0;
    };

    return {
      translate,
      state,
      item,
      save,
      addResponse,
      toggleMarkResponse,
      markToDeleteIdx,
      getMessageValidation,
      stateOfMessagesErrorsDirty,
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
