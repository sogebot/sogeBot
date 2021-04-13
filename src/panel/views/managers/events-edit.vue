<template>
  <div class="px-3 py-2">
    <form>
      <div class="row no-gutters pl-3 pr-3">
        <div
          class="card mb-3 p-0"
          :class="{
            'col-md-6': (supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables.length > 0,
            'col-md-12': !((supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables.length > 0)
          }"
        >
          <div class="card-header">
            {{ translate('events.dialog.settings') }}
          </div>
          <div class="card-body">
            <div class="form-group col-md-12">
              <label-inside>{{ translate('events.dialog.event') }}</label-inside>
              <b-select
                v-model="editationItem.name"
                :state="$v.editationItem.name.$error && $v.editationItem.name.$dirty ? false : null"
              >
                <b-select-option
                  :key="'empty-event'"
                  :value="''"
                  :disabled="true"
                >
                  --- please select event ---
                </b-select-option>
                <b-select-option
                  v-for="key of supported.events.map((o) => o.id)"
                  :key="key"
                  :value="key"
                >
                  {{ capitalize(translate(key)) }}
                </b-select-option>
              </b-select>
              <b-form-invalid-feedback :state="!($v.editationItem.name.$error && $v.editationItem.name.$dirty)">
                {{ translate('dialog.errors.required') }}
              </b-form-invalid-feedback>
            </div>
            <div
              v-for="defKey of Object.keys(editationItem.definitions)"
              :key="defKey"
              class="form-group col-md-12"
            >
              <label-inside>{{ translate("events.definitions." + defKey + ".label") }}</label-inside>
              <template v-if="defKey === 'titleOfReward'">
                {{ $v.editationItem.definitions.titleOfReward.$error && $v.editationItem.definitions.titleOfReward.$dirty ? false : null }}
                <rewards
                  :value.sync="editationItem.definitions[defKey]"
                  :state="$v.editationItem.definitions.titleOfReward.$error && $v.editationItem.definitions.titleOfReward.$dirty ? false : null"
                />
                <b-form-invalid-feedback :state="!($v.editationItem.definitions.titleOfReward.$error && $v.editationItem.definitions.titleOfReward.$dirty)">
                  {{ translate('dialog.errors.required') }}
                </b-form-invalid-feedback>
              </template>
              <template v-else-if="typeof editationItem.definitions[defKey] === 'boolean'">
                <button
                  v-if="editationItem.definitions[defKey]"
                  type="button"
                  class="btn btn-success"
                  @click="editationItem.definitions[defKey] = false"
                >
                  {{ translate("dialog.buttons.yes") }}
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-danger"
                  @click="editationItem.definitions[defKey] = true"
                >
                  {{ translate("dialog.buttons.no") }}
                </button>
              </template>
              <input
                v-else
                :id="defKey + '_input'"
                v-model="editationItem.definitions[defKey]"
                :class="{ 'is-invalid': getDefinitionValidation(defKey).$error }"
                type="text"
                class="form-control"
                :placeholder="translate('events.definitions.' + defKey + '.placeholder')"
              >
              <div
                v-if="getDefinitionValidation(defKey)"
                class="invalid-feedback"
              >
                <template v-if="!get(getDefinitionValidation(defKey), 'minValue', true)">
                  {{ translate('dialog.errors.minValue').replace('$value', get(getDefinitionValidation(defKey), '$params.minValue.min', 0)) }}
                </template>
                <template v-else>
                  {{ translate('dialog.errors.required') }}
                </template>
              </div>
            </div>
            <div class="form-group col-md-12">
              <label-inside>{{ translate("events.dialog.filters") }}</label-inside>
              <textarea
                v-model="editationItem.filter"
                class="form-control"
              />
            </div>
          </div>
        </div>
        <div
          v-if="(supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables.length > 0"
          class="card col-md-6 mb-3 p-0"
        >
          <div class="card-header">
            {{ translate('events.dialog.usable-events-variables') }}
          </div>
          <div class="card-body">
            <div class="form-group col-md-12 m-0">
              <dl
                class="row m-0"
                style="font-size:0.7rem;"
              >
                <template v-for="variables of (supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables">
                  <dt
                    :key="variables + '1'"
                    class="col-4"
                  >
                    ${{ variables }}
                  </dt>
                  <dd
                    :key="variables + '2'"
                    class="col-8"
                  >
                    {{ translate('responses.variable.' + variables) }}
                  </dd>
                </template>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <b-card
        no-body
        class="ml-3 mr-3 border-bottom-0"
      >
        <b-card-header class="border-bottom-0">
          {{ translate('events.dialog.operations') }}
        </b-card-header>
      </b-card>
      <div
        v-for="(operation, index) of editationItem.operations"
        :key="operation.name + index"
        class="row no-gutters pl-3 pr-3"
        :class="{'pt-2': index !== 0}"
      >
        <div class="card col-12">
          <div class="card-body">
            <div class="form-group col-md-12">
              <b-select
                v-model="operation.name"
                :state="!$v.editationItem.operations.doesSomething && $v.editationItem.operations.$dirty ? false : null"
              >
                <b-select-option
                  v-for="key of supported.operations.map((o) => o.id)"
                  :key="key"
                  :value="key"
                >
                  {{ capitalize(translate(key)) }}
                </b-select-option>
              </b-select>
              <b-form-invalid-feedback
                v-if="operation.name === 'do-nothing'"
                :state="!(!$v.editationItem.operations.doesSomething && $v.editationItem.operations.$dirty)"
              >
                {{ translate('dialog.errors.required') }}
              </b-form-invalid-feedback>

              <div
                v-for="(defKey, indexDef) of Object.keys(operation.definitions)"
                :key="defKey"
                class="mt-2"
                :class="{'pt-2': indexDef === 0}"
              >
                <template v-if="supported.operations.find(o => o.id === operation.name)">
                  <template v-if="['messageToSend', 'commandToRun'].includes(defKey)">
                    <label-inside>{{ translate("events.definitions." + defKey + ".label") }}</label-inside>
                    <textarea-with-tags
                      :value.sync="operation.definitions[defKey]"
                      :placeholder="translate('events.definitions.' + defKey + '.placeholder')"
                      :state="!(getOperationDefinitionValidation(index, defKey).$error && getOperationDefinitionValidation(index, defKey).$dirty)"
                      :filters="['global', ...(supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables]"
                      @input="getOperationDefinitionValidation(index, defKey).$touch();"
                      @update="operation.definitions[defKey] = $event"
                    />
                  </template>
                  <template v-else-if="Array.isArray(supported.operations.find(o => o.id === operation.name).definitions[defKey])">
                    <label-inside>{{ translate("events.definitions." + defKey + ".label") }}</label-inside>
                    <b-select
                      v-model="operation.definitions[defKey]"
                      class="form-control"
                    >
                      <b-select-option
                        v-for="value of supported.operations.find(o => o.id === operation.name).definitions[defKey]"
                        :key="value"
                        :value="value"
                      >
                        {{ value }}
                      </b-select-option>
                    </b-select>
                  </template>
                  <template v-else-if="typeof operation.definitions[defKey] === 'string'">
                    <label-inside>{{ translate("events.definitions." + defKey + ".label") }}</label-inside>
                    <b-input
                      v-model="operation.definitions[defKey]"
                      type="text"
                      class="form-control"
                      :state="getOperationDefinitionValidation(index, defKey).$error && getOperationDefinitionValidation(index, defKey).$dirty ? false : null"
                      :placeholder="translate('events.definitions.' + defKey + '.placeholder')"
                    />
                  </template>
                  <template v-else-if="typeof operation.definitions[defKey] === 'boolean'">
                    <label>{{ translate("events.definitions." + defKey + ".label") }}</label>
                    <button
                      v-if="operation.definitions[defKey]"
                      type="button"
                      class="btn btn-success"
                      @click="operation.definitions[defKey] = false"
                    >
                      {{ translate("dialog.buttons.yes") }}
                    </button>
                    <button
                      v-else
                      type="button"
                      class="btn btn-danger"
                      @click="operation.definitions[defKey] = true"
                    >
                      {{ translate("dialog.buttons.no") }}
                    </button>
                  </template>
                  <b-form-invalid-feedback :state="!(getOperationDefinitionValidation(index, defKey).$error && getOperationDefinitionValidation(index, defKey).$dirty)">
                    {{ translate('dialog.errors.required') }}
                  </b-form-invalid-feedback>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, getCurrentInstance, onMounted, onUnmounted, ref, watch,
} from '@vue/composition-api';
import { cloneDeep, get } from 'lodash-es';
import { v4 as uuid } from 'uuid';
import { validationMixin } from 'vuelidate';
import {
  minLength, minValue, numeric, required, requiredIf,
} from 'vuelidate/lib/validators';

import { EventInterface, EventOperationInterface } from 'src/bot/database/entity/event';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { capitalize } from 'src/panel/helpers/capitalize';
import { error } from 'src/panel/helpers/error';
import { EventBus } from 'src/panel/helpers/event-bus';

const socket = getSocket('/core/events');

type Props = {
  id: string;
  invalid: boolean;
  pending: boolean;
  saveState: number;
};

export default defineComponent({
  components: {
    rewards:        () => import('src/panel/components/rewardDropdown.vue'),
    'label-inside': () => import('src/panel/components/label-inside.vue'),
  },
  mixins: [ validationMixin ],
  props:  {
    id:        String,
    invalid:   Boolean,
    pending:   Boolean,
    saveState: Number,
  },
  validations: {
    editationItem: {
      name:       { required, minLength: minLength(1) },
      operations: {
        doesSomething: (val: Omit<EventOperationInterface, 'event'>[]) => {
          return val.filter(o => o.name !== 'do-nothing').length > 0;
        },
        $each: {
          definitions: {
            messageToSend: {
              required: requiredIf(function (model) {
                return typeof model?.messageToSend !== 'undefined';
              }),
            },
            commandToRun: {
              required: requiredIf(function (model) {
                return typeof model?.commandToRun !== 'undefined';
              }),
            },
            emotesToExplode: {
              required: requiredIf(function (model) {
                return typeof model?.emotesToExplode !== 'undefined';
              }),
            },
            channel: {
              required: requiredIf(function (model) {
                return typeof model?.channel !== 'undefined';
              }),
            },
            customVariable: {
              required: requiredIf(function (model) {
                return typeof model?.customVariable !== 'undefined';
              }),
            },
            emotesToFirework: {
              required: requiredIf(function (model) {
                return typeof model?.emotesToFirework !== 'undefined';
              }),
            },
            numberToDecrement: {
              required: requiredIf(function (model) {
                return typeof model?.numberToDecrement !== 'undefined';
              }),
              minValue: minValue(1),
              numeric,
            },
            numberToIncrement: {
              required: requiredIf(function (model) {
                return typeof model?.numberToIncrement !== 'undefined';
              }),
              minValue: minValue(1),
              numeric,
            },
            durationOfCommercial: {
              required: requiredIf(function (model) {
                return typeof model?.durationOfCommercial !== 'undefined';
              }),
            },
          },
        },
      },
      definitions: {
        fadeOutXCommands: {
          required: requiredIf(function (model) {
            return typeof model?.fadeOutXCommands !== 'undefined';
          }),
          numeric,
          minValue: minValue(0),
        },
        fadeOutInterval: {
          required: requiredIf(function (model) {
            return typeof model?.fadeOutInterval !== 'undefined';
          }),
          numeric,
          minValue: minValue(0),
        },
        runEveryXCommands: {
          required: requiredIf(function (model) {
            return typeof model?.runEveryXCommands !== 'undefined';
          }),
          numeric,
          minValue: minValue(0),
        },
        runEveryXKeywords: {
          required: requiredIf(function (model) {
            return typeof model?.runEveryXKeywords !== 'undefined';
          }),
          numeric,
          minValue: minValue(0),
        },
        fadeOutXKeywords: {
          required: requiredIf(function (model) {
            return typeof model?.fadeOutXKeywords !== 'undefined';
          }),
          numeric,
          minValue: minValue(0),
        },
        runInterval: {
          required: requiredIf(function (model) {
            return typeof model?.runInterval !== 'undefined';
          }),
          numeric,
          minValue: minValue(0),
        },
        commandToWatch: {
          required: requiredIf(function (model) {
            return typeof model?.commandToWatch !== 'undefined';
          }),
        },
        keywordToWatch: {
          required: requiredIf(function (model) {
            return typeof model?.keywordToWatch !== 'undefined';
          }),
        },
        runAfterXMinutes: {
          required: requiredIf(function (model) {
            return typeof model?.runAfterXMinutes !== 'undefined';
          }),
          numeric,
          minValue: minValue(1),
        },
        runEveryXMinutes: {
          required: requiredIf(function (model) {
            return typeof model?.runEveryXMinutes !== 'undefined';
          }),
          numeric,
          minValue: minValue(1),
        },
        viewersAtLeast: {
          required: requiredIf(function (model) {
            return typeof model?.viewersAtLeast !== 'undefined';
          }),
          numeric,
          minValue: minValue(0),
        },
        titleOfReward: {
          required: requiredIf(function (model) {
            return typeof model?.titleOfReward !== 'undefined';
          }),
        },
      },
    },
  },
  setup(props: Props, ctx) {
    const instance = getCurrentInstance()?.proxy;

    const editationItem = ref({
      id:          ctx.root.$route.params.id || uuid(),
      name:        '',
      isEnabled:   true,
      triggered:   {},
      definitions: {},
      operations:  [],
      filter:      '',
    } as Required<EventInterface>);
    const operationsClone = ref([] as Omit<EventOperationInterface, 'event'>[]);
    const watchOperationChange = ref(true);
    const watchEventChange = ref(true);
    const events = ref([] as EventInterface[]);
    const supported = ref({ operations: [], events: [] } as {
      operations: Events.SupportedOperation[],
      events: Events.SupportedEvent[]
    });

    const state = ref({ loading: ButtonStates.progress } as {
      loading: number;
    });

    watch(editationItem, (val, oldVal) => {
      if (state.value.loading !== ButtonStates.progress && watchEventChange.value) {
        ctx.emit('update:pending', true);

        const $v = instance?.$v;
        if ($v) {
          ctx.emit('update:invalid', (!!$v.editationItem.definitions?.$error && !!$v.editationItem.definitions.$dirty) || stateOfOperationsErrorsDirty() || (!$v.editationItem.operations?.doesSomething && $v.editationItem.operations?.$dirty)|| ($v.editationItem.name?.$error && $v.editationItem.name.$dirty));
        }
      }
    }, { deep: true });
    watch(() => editationItem.value.operations, (val: Omit<EventOperationInterface, 'event'>[]) => {
      if (!watchOperationChange.value) {
        return true;
      }
      watchOperationChange.value = false; // remove watch
      // remove all do-nothing
      val = val.filter((o) => o.name !== 'do-nothing');

      let j = 0;
      for (let i = 0; i < val.length; i++) {
        // find first operationClone
        if (typeof operationsClone.value[j] !== 'undefined' && val[i].name !== operationsClone.value[j].name) {
          j++;
          i--;
          continue;
        }
        if (typeof operationsClone.value[j] !== 'undefined' && val[i].name === operationsClone.value[j].name) {
          j++;
          continue;
        }

        val[i].definitions = {};
        const defaultOperation = supported.value.operations.find((o) => o.id === val[i].name);
        if (defaultOperation) {
          if (Object.keys(defaultOperation.definitions).length > 0) {
            for (const [key, value] of Object.entries(defaultOperation.definitions)) {
              val[i].definitions[key] = Array.isArray(value) ? value[0] : value; // select first option by default
            }
            ctx.root.$forceUpdate();
          }
        }

        const $v = instance?.$v;
        $v?.editationItem.operations?.$each[i]?.$reset();
        j++;
      }
      operationsClone.value = cloneDeep(val);
      // add do-nothing at the end
      val.push({
        id:          uuid(),
        name:        'do-nothing',
        definitions: {},
      });

      // update clone
      editationItem.value.operations = cloneDeep(val);
      ctx.root.$nextTick(() => (watchOperationChange.value = true)); // re-enable watch

    }, { deep: true });
    watch(() => editationItem.value.name, (val, oldVal) => {
      if (!watchEventChange.value) {
        return;
      }
      watchEventChange.value = false;

      if (val !== oldVal) {
        editationItem.value.definitions = {}; // reload definitions

        const defaultEvent = supported.value.events.find((o) => o.id === val);
        if (defaultEvent) {
          if (defaultEvent.definitions) {
            editationItem.value.definitions = defaultEvent.definitions;
          }
        }

        const $v = instance?.$v;
        $v?.editationItem.definitions?.$reset();
      }
      ctx.root.$nextTick(() => {
        watchEventChange.value = true;
      });
    });
    const eventTypes = computed(() => {
      return [...new Set(events.value.map(o => o.name))];
    });

    const filteredEvents = computed(() => {
      const _events = events.value;
      return _events.sort((a, b) => {
        const A = a.name.toLowerCase();
        const B = b.name.toLowerCase();
        if (A < B)  { //sort string ascending
          return -1;
        }
        if (A > B) {
          return 1;
        }
        return 0; //default return value (no sorting)
      });
    });

    onMounted(() => {
      loadEditationItem();
      ctx.emit('update:pending', false);
      EventBus.$on('managers::events::save::' + editationItem.value.id, () => {
        console.debug('Save event received - managers::events::save::' + editationItem.value.id);
        save();
      });
    });
    onUnmounted(() => {
      EventBus.$off('managers::events::save::' + editationItem.value.id);
    });
    const loadEditationItem = async () => {
      state.value.loading = ButtonStates.progress;
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          if (ctx.root.$route.params.id) {
            socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, eventGetAll: Required<EventInterface> | undefined) => {
              if (err) {
                reject(error(err));
              }
              if (!eventGetAll) {
                watchEventChange.value = false;
                editationItem.value = {
                  id:          ctx.root.$route.params.id,
                  name:        '',
                  isEnabled:   true,
                  triggered:   {},
                  definitions: {},
                  operations:  [],
                  filter:      '',
                };
                watchEventChange.value = true;
                resolve();
                return;
              }
              watchEventChange.value = false;

              if (eventGetAll.operations.length === 0 || eventGetAll.operations[eventGetAll.operations.length - 1].name !== 'do-nothing') {
                eventGetAll.operations.push({
                  id:          uuid(),
                  name:        'do-nothing',
                  definitions: {},
                });
              }

              editationItem.value.id = eventGetAll.id;
              operationsClone.value = cloneDeep(eventGetAll.operations);
              editationItem.value.operations = cloneDeep(eventGetAll.operations);
              editationItem.value.name = eventGetAll.name;
              editationItem.value.isEnabled = eventGetAll.isEnabled;
              editationItem.value.triggered = { ...eventGetAll.triggered };
              editationItem.value.definitions = { ...eventGetAll.definitions };
              editationItem.value.filter = eventGetAll.filter;

              console.debug('Loaded', eventGetAll);
              ctx.root.$nextTick(() => {
                watchEventChange.value = true;
                ctx.emit('update:pending', false);
              });
              resolve();
            });
          }
          resolve();
        }),
        new Promise<void>((resolve, reject) => {
          socket.emit('list.supported.operations', (err: string | null, data: Events.SupportedOperation[]) => {
            if (err) {
              reject(error(err));
            }
            data.push({ // add do nothing - its basicaly delete of operation
              id:          'do-nothing',
              definitions: {},
              fire:        () => {
                return;
              },
            });
            supported.value.operations = data.sort((a, b) => {
              const A = translate(a.id).toLowerCase();
              const B = translate(b.id).toLowerCase();
              if (A < B || a.id === 'do-nothing')  { //sort string ascending
                return -1;
              }
              if (A > B || b.id === 'do-nothing') {
                return 1;
              }
              return 0; //default return value (no sorting)
            });

            if (!ctx.root.$route.params.id) {
              // set first operation if we are in create mode
              editationItem.value.operations.push({
                id:          uuid(),
                name:        'do-nothing',
                definitions: {},
              });
            }
            resolve();
          });
        }),
        new Promise<void>((resolve, reject) => {
          socket.emit('list.supported.events', (err: string | null, data: Events.SupportedEvent[]) => {
            if (err) {
              reject(error(err));
            }

            for (const d of data) {
              // sort variables
              if (d.variables) {
                d.variables = d.variables.sort((A, B) => {
                  if (A < B)  { //sort string ascending
                    return -1;
                  }
                  if (A > B) {
                    return 1;
                  }
                  return 0; //default return value (no sorting)
                });
              } else {
                d.variables = [];
              }
            }
            supported.value.events = data.sort((a, b) => {
              const A = translate(a.id).toLowerCase();
              const B = translate(b.id).toLowerCase();
              if (A < B)  { //sort string ascending
                return -1;
              }
              if (A > B) {
                return 1;
              }
              return 0; //default return value (no sorting)
            });
            resolve();
          });
        }),
      ]);
      ctx.root.$nextTick(() => {
        ctx.emit('update:pending', false);
        state.value.loading = ButtonStates.success;
      });
    };
    const getDefinitionValidation = (key: string) => {
      const $v = instance?.$v;
      return get($v, 'editationItem.definitions.' + key, { $error: false });
    };
    const getOperationDefinitionValidation = (idx: number, key: string) => {
      const $v = instance?.$v;
      return get($v, 'editationItem.operations.$each[' + idx + '].definitions.' + key, {
        $error: false, $dirty: false, $touch: () => {
          return;
        },
      });
    };
    const save = () =>  {
      const $v = instance?.$v;
      $v?.$touch();
      ctx.emit('update:invalid', (!!$v?.editationItem.definitions?.$error && !!$v.editationItem.definitions.$dirty) || stateOfOperationsErrorsDirty() || (!$v?.editationItem.operations?.doesSomething && $v?.editationItem.operations?.$dirty)|| ($v?.editationItem.name?.$error && $v.editationItem.name.$dirty));
      if (!$v?.$error) {
        ctx.emit('update:saveState', ButtonStates.progress);
        socket.emit('events::save', editationItem.value, (err: string | null, eventId: string) => {
          if (err) {
            ctx.emit('update:saveState', ButtonStates.fail);
            error(err);
          } else {
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
    const stateOfOperationsErrorsDirty = () => {
      const $v = instance?.$v;
      return Object.values($v?.editationItem.operations?.$each.$iter ?? []).filter(o => {
        return (!!o.$error && !!o.$dirty);
      }).length > 0;
    };

    return {
      events,
      eventTypes,
      state,
      filteredEvents,
      save,

      editationItem,
      supported,
      getDefinitionValidation,
      getOperationDefinitionValidation,
      stateOfOperationsErrorsDirty,

      translate,
      capitalize,
      ButtonStates,
      get,
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
