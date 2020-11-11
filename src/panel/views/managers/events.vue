<template>
  <div class="container-fluid" ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.event-listeners') }}
        </span>
      </b-col>
    </b-row>

    <panel cards>
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" @click="newItem">{{translate('events.dialog.title.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === ButtonStates.progress" />
    <div class="alert alert-info" v-else-if="state.loading === 0 && events.length === 0">
      {{translate('events.noEvents')}}
    </div>
    <div v-else>
      <b-sidebar
        @change="isSidebarVisibleChange"
        :visible="isSidebarVisible"
        :no-slide="!sidebarSlideEnabled"
        width="800px"
        no-close-on-route-change
        shadow
        no-header
        right
        backdrop>
        <template v-slot:footer="{ hide }">
          <div class="d-flex bg-opaque align-items-center px-3 py-2 border-top border-gray" style="justify-content: flex-end">
            <b-button class="mx-2" @click="hide" variant="link">{{ translate('dialog.buttons.close') }}</b-button>
            <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="(!!$v.editationItem.definitions.$error && !!$v.editationItem.definitions.$dirty) || stateOfOperationsErrorsDirty() || (!$v.editationItem.operations.doesSomething && $v.editationItem.operations.$dirty)|| ($v.editationItem.name.$error && $v.editationItem.name.$dirty)"/>
          </div>
        </template>
        <div class="px-3 py-2">
          <form>
            <div class="row no-gutters pl-3 pr-3">
              <div class="card mb-3 p-0"
                  :class="{
                      'col-md-6': (supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables.length > 0,
                      'col-md-12': !((supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables.length > 0)
                  }"
              >
                <div class="card-header">{{translate('events.dialog.settings')}}</div>
                <div class="card-body">
                  <div class="form-group col-md-12">
                    <label for="type_selector">{{ translate('events.dialog.event') }}</label>
                    <b-select
                        v-model="editationItem.name"
                        :state="$v.editationItem.name.$error && $v.editationItem.name.$dirty ? false : null">
                      <b-select-option :value="''" :key="'empty-event'" :disabled="true">--- please select event ---</b-select-option>
                      <b-select-option v-for="key of supported.events.map((o) => o.id)" :value="key" :key="key">{{capitalize(translate(key))}}</b-select-option>
                    </b-select>
                    <b-form-invalid-feedback :state="!($v.editationItem.name.$error && $v.editationItem.name.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
                  </div>
                  <div class="form-group col-md-12" v-for="defKey of Object.keys(editationItem.definitions)" :key="defKey">
                    <label for="type_selector">{{ translate("events.definitions." + defKey + ".label") }}</label>
                    <template v-if="defKey === 'titleOfReward'">
                      {{ $v.editationItem.definitions.titleOfReward.$error && $v.editationItem.definitions.titleOfReward.$dirty ? false : null }}
                      <rewards :value.sync="editationItem.definitions[defKey]" :state="$v.editationItem.definitions.titleOfReward.$error && $v.editationItem.definitions.titleOfReward.$dirty ? false : null"/>
                      <b-form-invalid-feedback :state="!($v.editationItem.definitions.titleOfReward.$error && $v.editationItem.definitions.titleOfReward.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
                    </template>
                    <template v-else-if="typeof editationItem.definitions[defKey] === 'boolean'">
                      <button type="button" class="btn btn-success" v-if="editationItem.definitions[defKey]" @click="editationItem.definitions[defKey] = false">{{translate("dialog.buttons.yes")}}</button>
                      <button type="button" class="btn btn-danger" v-else @click="editationItem.definitions[defKey] = true">{{translate("dialog.buttons.no")}}</button>
                    </template>
                    <input v-else v-model="editationItem.definitions[defKey]" :class="{ 'is-invalid': getDefinitionValidation(defKey).$error }" type="text" class="form-control" :id="defKey + '_input'" :placeholder="translate('events.definitions.' + defKey + '.placeholder')">
                    <div class="invalid-feedback" v-if="getDefinitionValidation(defKey)">
                      <template v-if="!get(getDefinitionValidation(defKey), 'minValue', true)">
                        {{translate('dialog.errors.minValue').replace('$value', get(getDefinitionValidation(defKey), '$params.minValue.min', 0)) }}
                      </template>
                      <template v-else>
                        {{translate('dialog.errors.required')}}
                      </template>
                    </div>
                  </div>
                  <div class="form-group col-md-12">
                    <label for="type_selector">{{ translate("events.dialog.filters") }}</label>
                    <textarea v-model="editationItem.filter" class="form-control"/>
                  </div>
                </div>
              </div>
              <div class="card col-md-6 mb-3 p-0" v-if="(supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables.length > 0">
                <div class="card-header">{{translate('events.dialog.usable-events-variables')}}</div>
                <div class="card-body">
                  <div class="form-group col-md-12 m-0">
                    <dl class="row m-0" style="font-size:0.7rem;">
                      <template v-for="variables of (supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables">
                        <dt class="col-4" :key="variables + '1'">${{variables}}</dt>
                        <dd class="col-8" :key="variables + '2'">{{translate('responses.variable.' + variables) }}</dd>
                      </template>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <b-card no-body class="ml-3 mr-3 border-bottom-0">
              <b-card-header class="border-bottom-0">{{translate('events.dialog.operations')}}</b-card-header>
            </b-card>
            <div class="row no-gutters pl-3 pr-3" v-for="(operation, index) of editationItem.operations" :key="operation.name + index"
                :class="{'pt-2': index !== 0}">
              <div class="card col-12">
                <div class="card-body">
                  <div class="form-group col-md-12">
                    <b-select v-model="operation.name"
                      :state="!$v.editationItem.operations.doesSomething && $v.editationItem.operations.$dirty ? false : null">
                      <b-select-option v-for="key of supported.operations.map((o) => o.id)" :value="key" :key="key">{{capitalize(translate(key))}}</b-select-option>
                    </b-select>
                    <b-form-invalid-feedback v-if="operation.name === 'do-nothing'" :state="!(!$v.editationItem.operations.doesSomething && $v.editationItem.operations.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>

                    <div v-for="(defKey, indexDef) of Object.keys(operation.definitions)" :key="defKey"
                      class="mt-2"
                      :class="{'pt-2': indexDef === 0}">

                      <label for="type_selector">{{ translate("events.definitions." + defKey + ".label") }}</label>
                      <template v-if="supported.operations.find(o => o.id === operation.name)">
                        <textarea-with-tags
                          v-if="['messageToSend', 'commandToRun'].includes(defKey)"
                          :value.sync="operation.definitions[defKey]"
                          @input="getOperationDefinitionValidation(index, defKey).$touch();"
                          :placeholder="translate('events.definitions.' + defKey + '.placeholder')"
                          :state="!(getOperationDefinitionValidation(index, defKey).$error && getOperationDefinitionValidation(index, defKey).$dirty)"
                          :filters="['global', ...(supported.events.find((o) => o.id === editationItem.name) || { variables: []}).variables]"
                          @update="operation.definitions[defKey] = $event"
                        />
                        <b-select
                            class="form-control"
                            v-else-if="Array.isArray(supported.operations.find(o => o.id === operation.name).definitions[defKey])"
                            v-model="operation.definitions[defKey]">
                          <b-select-option v-for="value of supported.operations.find(o => o.id === operation.name).definitions[defKey]" :key="value" :value="value">{{value}}</b-select-option>
                        </b-select>
                        <template v-else-if="typeof operation.definitions[defKey] === 'string'">
                          <b-input
                            type="text" class="form-control"
                            v-model="operation.definitions[defKey]"
                            :state="getOperationDefinitionValidation(index, defKey).$error && getOperationDefinitionValidation(index, defKey).$dirty ? false : null"
                            :placeholder="translate('events.definitions.' + defKey + '.placeholder')"/>
                        </template>
                        <template v-else-if="typeof operation.definitions[defKey] === 'boolean'">
                          <button type="button" class="btn btn-success" v-if="operation.definitions[defKey]" @click="operation.definitions[defKey] = false">{{translate("dialog.buttons.yes")}}</button>
                          <button type="button" class="btn btn-danger" v-else @click="operation.definitions[defKey] = true">{{translate("dialog.buttons.no")}}</button>
                        </template>
                        <b-form-invalid-feedback :state="!(getOperationDefinitionValidation(index, defKey).$error && getOperationDefinitionValidation(index, defKey).$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </b-sidebar>
      <div v-for="(type, idx) of eventTypes" v-bind:key="type + idx">
        <span class="title text-default mb-2" style="font-size: 20px !important;">{{capitalize(translate(type))}}</span>
        <div v-for="(event, i) of filteredEvents.filter(o => o.name === type)"
            v-bind:data-id="event.id"
            v-bind:data-index="i"
            class="card mb-3"
            v-bind:key="event.id">
          <div class="card-body d-inline-flex">
            <div v-if="Object.keys(event.definitions).length > 0 || event.filter.length > 0"  class="p-2 bg-light border-input mr-4" style="border: 1px solid; width: 40%;">
              <dl>
                <template v-if="event.filter.length > 0">
                  <dd :key="event.id + event.filter + '0'">{{translate('events.definitions.filter.label')}}: <span class="variable ml-2">{{event.filter}}</span></dd>
                </template>
                <template v-for="key of Object.keys(event.definitions)">
                  <dd :key="event.id + key + '0'">{{translate('events.definitions.' + key + '.label')}}: <span class="variable">{{event.definitions[key]}}</span></dd>
                </template>
              </dl>
            </div>
            <div class="w-100">
              <div v-for="(operation, idx) of event.operations" :key="event.id + operation.name" :class="{ 'pt-2': idx !== 0}">
                <div class="d-inline-flex border-input mr-4 w-100" style="border: 1px dotted" >
                  <div class="bg-light p-2" style="width: fit-content;">
                    <strong :key="event.id + operation.name + '4'"  style="font-size: 18px;">{{capitalize(translate(operation.name))}}</strong>
                  </div>
                  <dl :key="event.id + operation.name + '5'" class="w-100 p-2">
                  <template v-for="key of Object.keys(operation.definitions)">
                    <dd :key="event.id + key + '2'">{{translate('events.definitions.' + key + '.label')}}: <span class="variable ml-2">{{operation.definitions[key]}}</span></dd>
                  </template>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer text-right">
            <button-with-icon
              v-if="event.isEnabled"
              :text="translate('dialog.buttons.enabled')"
              @click="event.isEnabled = false; sendUpdate(event);"
              class="btn-success btn-shrink"
              icon="toggle-on"
              />
            <button-with-icon
              v-else
              :text="translate('dialog.buttons.disabled')"
              @click="event.isEnabled = true; sendUpdate(event);"
              class="btn-danger btn-shrink"
              icon="toggle-off"
              />

            <state-button text="test"
                          :icon="['far', 'bell']"
                          cl="btn-secondary btn-shrink"
                          @click="triggerTest(event.id)"
                          :state="typeof testingInProgress[event.id] !== 'undefined' ? testingInProgress[event.id] : 0"/>

            <button-with-icon
              :text="translate('dialog.buttons.edit')"
              :href="'#/manage/events/edit/' + event.id"
              class="btn-primary btn-shrink"
              icon="edit"
              />

            <button-with-icon class="btn-danger btn-reverse" icon="trash" @click="deleteEvent(event)">
              {{ translate('dialog.buttons.delete') }}
            </button-with-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch, getCurrentInstance } from '@vue/composition-api'
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import translate from 'src/panel/helpers/translate';
import { v4 as uuid } from 'uuid';

import { getSocket } from 'src/panel/helpers/socket';

import { EventInterface, EventOperationInterface } from 'src/bot/database/entity/event';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { capitalize } from 'src/panel/helpers/capitalize';

import { validationMixin } from 'vuelidate'
import { minLength, minValue, required, requiredIf, numeric } from 'vuelidate/lib/validators'
import { cloneDeep, get } from 'lodash-es';

const socket = getSocket('/core/events');

export default defineComponent({
  mixins: [ validationMixin ],
  components: {
    rewards: () => import('src/panel/components/rewardDropdown.vue'),
    loading: () => import('src/panel/components/loading.vue'),
    'font-awesome-layers': FontAwesomeLayers,
  },
  validations: {
    editationItem: {
      name: { required, minLength: minLength(1) },
      operations: {
        doesSomething: (val: Omit<EventOperationInterface, 'event'>[]) => {
          return val.filter(o => o.name !== 'do-nothing').length > 0
        },
        $each: {
          definitions: {
            messageToSend: {
              required: requiredIf(function (model) {
                return typeof model?.messageToSend !== 'undefined'
              }),
            },
            commandToRun: {
              required: requiredIf(function (model) {
                return typeof model?.commandToRun !== 'undefined'
              }),
            },
            emotesToExplode: {
              required: requiredIf(function (model) {
                return typeof model?.emotesToExplode !== 'undefined'
              }),
            },
            channel: {
              required: requiredIf(function (model) {
                return typeof model?.channel !== 'undefined'
              }),
            },
            customVariable: {
              required: requiredIf(function (model) {
                return typeof model?.customVariable !== 'undefined'
              }),
            },
            emotesToFirework: {
              required: requiredIf(function (model) {
                return typeof model?.emotesToFirework !== 'undefined'
              }),
            },
            numberToDecrement: {
              required: requiredIf(function (model) {
                return typeof model?.numberToDecrement !== 'undefined'
              }),
              minValue: minValue(1),
              numeric,
            },
            numberToIncrement: {
              required: requiredIf(function (model) {
                return typeof model?.numberToIncrement !== 'undefined'
              }),
              minValue: minValue(1),
              numeric,
            },
            durationOfCommercial: {
              required: requiredIf(function (model) {
                return typeof model?.durationOfCommercial !== 'undefined'
              })
            },
          }
        },
      },
      definitions: {
        fadeOutXCommands: {
          required: requiredIf(function (model) {
            return typeof model?.fadeOutXCommands !== 'undefined'
          }),
          numeric,
          minValue: minValue(0)
        },
        fadeOutInterval: {
          required: requiredIf(function (model) {
            return typeof model?.fadeOutInterval !== 'undefined'
          }),
          numeric,
          minValue: minValue(0)
        },
        runEveryXCommands: {
          required: requiredIf(function (model) {
            return typeof model?.runEveryXCommands !== 'undefined'
          }),
          numeric,
          minValue: minValue(0)
        },
        runEveryXKeywords: {
          required: requiredIf(function (model) {
            return typeof model?.runEveryXKeywords !== 'undefined'
          }),
          numeric,
          minValue: minValue(0)
        },
        fadeOutXKeywords: {
          required: requiredIf(function (model) {
            return typeof model?.fadeOutXKeywords !== 'undefined'
          }),
          numeric,
          minValue: minValue(0)
        },
        runInterval: {
          required: requiredIf(function (model) {
            return typeof model?.runInterval !== 'undefined'
          }),
          numeric,
          minValue: minValue(0)
        },
        commandToWatch: {
          required: requiredIf(function (model) {
            return typeof model?.commandToWatch !== 'undefined'
          }),
        },
        keywordToWatch: {
          required: requiredIf(function (model) {
            return typeof model?.keywordToWatch !== 'undefined'
          }),
        },
        runAfterXMinutes: {
          required: requiredIf(function (model) {
            return typeof model?.runAfterXMinutes !== 'undefined'
          }),
          numeric,
          minValue: minValue(1)
        },
        runEveryXMinutes: {
          required: requiredIf(function (model) {
            return typeof model?.runEveryXMinutes !== 'undefined'
          }),
          numeric,
          minValue: minValue(1)
        },
        viewersAtLeast: {
          required: requiredIf(function (model) {
            return typeof model?.viewersAtLeast !== 'undefined'
          }),
          numeric,
          minValue: minValue(0)
        },
        titleOfReward: {
          required: requiredIf(function (model) {
            return typeof model?.titleOfReward !== 'undefined'
          }),
        }
      }
    }
  },
  setup(props, ctx) {
    const instance = getCurrentInstance();
    const isSidebarVisible = ref(false);
    const sidebarSlideEnabled = ref(true);

    const events = ref([] as EventInterface[]);

    const editationItem = ref({
      id: ctx.root.$route.params.id || uuid(),
      name: '',
      isEnabled: true,
      triggered: {},
      definitions: {},
      operations: [],
      filter: '',
    } as Required<EventInterface>);
    const operationsClone = ref([] as Omit<EventOperationInterface, 'event'>[]);
    const watchOperationChange = ref(true);
    const watchEventChange = ref(true);
    const supported = ref({ operations: [], events: [] } as {
        operations: Events.SupportedOperation[],
        events: Events.SupportedEvent[]
    });

    const testingInProgress = ref({} as {[x:string]: number});
    const deletionInProgress = ref({} as {[x:string]: number});
    const heightOfElement = ref({} as {[x:string]: any});
    const state = ref({
      loading: ButtonStates.progress,
      save: ButtonStates.idle,
      pending: false,
      editationLoading: ButtonStates.idle,
    } as {
      loading: number;
      save: number;
      pending: boolean;
      editationLoading: number;
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
      if (state.value.loading === ButtonStates.success) {
        state.value.pending = true;
      }
    }, { deep: true });
    watch(() => editationItem.value.operations, (val: Omit<EventOperationInterface, 'event'>[]) => {
      if (!watchOperationChange.value) return true;
      watchOperationChange.value = false // remove watch

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
          continue
        }

        val[i].definitions = {}
        const defaultOperation = supported.value.operations.find((o) => o.id === val[i].name)
        if (defaultOperation) {
          if (Object.keys(defaultOperation.definitions).length > 0) {
            for (const [key, value] of Object.entries(defaultOperation.definitions)) {
              val[i].definitions[key] = Array.isArray(value) ? value[0] : value; // select first option by default
            }
            ctx.root.$forceUpdate()
          }
        }

        const $v = instance?.$v;
        $v?.editationItem.operations?.$each[i]?.$reset();
        j++;
      }
      operationsClone.value = cloneDeep(val)
      // add do-nothing at the end
      val.push({
        id: uuid(),
        name: 'do-nothing',
        definitions: {}
      });

      // update clone
      editationItem.value.operations = cloneDeep(val)
      ctx.root.$nextTick(() => (watchOperationChange.value = true)) // re-enable watch

    }, { deep: true });
    watch(() => editationItem.value.name, (val, oldVal) => {
      if (!watchEventChange.value) return;
      watchEventChange.value = false;

      if (val !== oldVal) {
        editationItem.value.definitions = {}; // reload definitions

        const defaultEvent = supported.value.events.find((o) => o.id === val)
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
      })
    }, { deep: true });

    const eventTypes = computed(() => {
      return [...new Set(events.value.map(o => o.name))];
    })

    const filteredEvents = computed(() => {
      let _events = events.value
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
        })
    });

    onMounted(() => {
      refresh();
      loadEditationItem();
      if (ctx.root.$route.params.id) {
        isSidebarVisible.value = true;
      }
    });

    const refresh = () => {
      socket.emit('generic::getAll', (err: string | null, data: EventInterface[]) => {
        if (err) {
          return error(err);
        }
        events.value = data;
        console.groupCollapsed('events::generic::getAll')
        console.debug({data});
        console.groupEnd();
        state.value.loading = ButtonStates.idle;
      });
    };
    const deleteEvent = (event: EventInterface) => {
      if (confirm(`Do you want to delete event for ${editationItem.value.name} with ${editationItem.value.operations.length} operation(s)?`)) {
        socket.emit('events::remove', event, (err: string | null) => {
          if (err) {
            return error(err);
          }
          refresh();
        })
      }
    };
    const triggerTest = (id: string) => {
      testingInProgress.value[id] = 1;
      socket.emit('test.event', id, () => {
        testingInProgress.value[id] = 2;
        setTimeout(() => {
          testingInProgress.value[id] = 0;
        }, 1000)
      });
    };
    const sendUpdate = (event: EventInterface) => {
      socket.emit('events::save', event, (err: string | null) => {
        if (err) {
          error(err);
        }
      })
    };
    const newItem = () => {
      ctx.root.$router.push({ name: 'EventsManagerEdit', params: { id: uuid() } }).catch(() => {});
    };
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
        ctx.root.$router.push({ name: 'EventsManagerList' }).catch(() => {});
      } else {
        if (sidebarSlideEnabled.value) {
          state.value.editationLoading = ButtonStates.progress;
          loadEditationItem();
        }
      }
    }
    const loadEditationItem = async () => {
      state.value.editationLoading = ButtonStates.progress
      await Promise.all([
        new Promise((resolve, reject) => {
          if (ctx.root.$route.params.id) {
            socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, eventGetAll: Required<EventInterface> | undefined) => {
              if (err) {
                reject(error(err));
              }
              if (!eventGetAll) {
                watchEventChange.value = false;
                editationItem.value = {
                  id: ctx.root.$route.params.id,
                  name: '',
                  isEnabled: true,
                  triggered: {},
                  definitions: {},
                  operations: [],
                  filter: '',
                };
                watchEventChange.value = true;
                resolve();
                return;
              }
              watchEventChange.value = false;

              if (eventGetAll.operations.length === 0 || eventGetAll.operations[eventGetAll.operations.length - 1].name !== 'do-nothing') {
                eventGetAll.operations.push({
                  id: uuid(),
                  name: 'do-nothing',
                  definitions: {}
                });
              }

              editationItem.value.id = eventGetAll.id;
              operationsClone.value = cloneDeep(eventGetAll.operations);
              editationItem.value.operations = eventGetAll.operations;
              editationItem.value.name = eventGetAll.name;
              editationItem.value.isEnabled = eventGetAll.isEnabled;
              editationItem.value.triggered = { ...eventGetAll.triggered };
              editationItem.value.definitions = { ...eventGetAll.definitions };
              editationItem.value.filter = eventGetAll.filter;

              console.debug('Loaded', eventGetAll);
              ctx.root.$nextTick(() => (watchEventChange.value = true));
              resolve();
            });
          }
          resolve();
        }),
        new Promise((resolve, reject) => {
          socket.emit('list.supported.operations', (err: string | null, data: Events.SupportedOperation[]) => {
            if (err) reject(error(err));
            data.push({ // add do nothing - its basicaly delete of operation
              id: 'do-nothing',
              definitions: {},
              fire: () => {},
            })
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
                id: uuid(),
                name: 'do-nothing',
                definitions: {},
              });
            }
            resolve();
          })
        }),
        new Promise((resolve, reject) => {
          socket.emit('list.supported.events', (err: string | null, data: Events.SupportedEvent[]) => {
            if (err) reject(error(err));

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
                d.variables = []
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
            if (!ctx.root.$route.params.id) {
              // set first event if we are in create mode
              editationItem.value.name = supported.value.events[0].id
            }
            resolve();
          })
        }),
      ]);
      state.value.editationLoading = ButtonStates.success
    }
    const getDefinitionValidation = (key: string) => {
      const $v = instance?.$v;
      return get($v, 'editationItem.definitions.' + key, { $error: false });
    };
    const getOperationDefinitionValidation = (idx: number, key: string) => {
      const $v = instance?.$v;
      return get($v, 'editationItem.operations.$each[' + idx + '].definitions.' + key, { $error: false, $dirty: false, $touch: () => {} });
    };
    const save = () =>  {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$error) {
        state.value.save = ButtonStates.progress;
        socket.emit('events::save', editationItem.value, (err: string | null, eventId: string) => {
          if (err) {
            state.value.save = ButtonStates.fail;
            error(err)
          } else {
            state.value.save = ButtonStates.success;
            ctx.root.$router.push({ name: 'EventsManagerEdit', params: { id: editationItem.value?.id || '' } }).catch(() => {})
          }
          state.value.pending = false;
          refresh();
          setTimeout(() => {
            state.value.save = ButtonStates.idle;
          }, 1000)
        })
      }
    }
    const stateOfOperationsErrorsDirty = () => {
      const $v = instance?.$v;
      return Object.values($v?.editationItem.operations?.$each.$iter ?? []).filter(o => {
        return (!!o.$error && !!o.$dirty)
      }).length > 0;
    }

    return {
      events,
      eventTypes,
      testingInProgress,
      deletionInProgress,
      heightOfElement,
      state,
      filteredEvents,
      deleteEvent,
      triggerTest,
      sendUpdate,
      save,
      newItem,

      editationItem,
      supported,
      getDefinitionValidation,
      getOperationDefinitionValidation,
      stateOfOperationsErrorsDirty,

      isSidebarVisibleChange,
      isSidebarVisible,
      sidebarSlideEnabled,

      translate,
      capitalize,
      ButtonStates,
      get,
    }
  }
})
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
