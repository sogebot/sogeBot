<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.event-listeners') }}
          <template v-if="$route.params.id">
            <small><fa icon="angle-right"/></small>
            {{event.givenName}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </div>
    </div>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/events/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
        <button-with-icon :class="[ event.isEnabled ? 'btn-success' : 'btn-danger' ]" class="btn-reverse" icon="power-off" @click="event.isEnabled = !event.isEnabled">
          {{ translate('dialog.buttons.' + (event.isEnabled? 'enabled' : 'disabled')) }}
        </button-with-icon>
      </template>
      <template v-slot:right v-if="state.load === $state.success">
        <b-alert
          show
          variant="info"
          v-if="state.pending"
          v-html="translate('dialog.changesPending')"
          class="mr-2 p-2 mb-0"
        ></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$error"/>
      </template>
    </panel>

    <loading v-if="state.load !== $state.success" />
    <div class="pt-3" v-else>
      <h3>{{translate('events.dialog.event')}}</h3>
      <form>
        <div class="form-group col-md-12">
          <label for="name_input">{{ translate('events.dialog.name') }}</label>
          <input v-model="event.givenName" type="text" class="form-control" :class="{ 'is-invalid': $v.event.givenName.$invalid }" id="name_input">
          <div class="invalid-feedback">
            {{translate('dialog.errors.required')}}
          </div>
        </div>

        <div class="row no-gutters pl-3 pr-3">
          <div class="card mb-3 p-0"
               :class="{
                  'col-md-6': (supported.events.find((o) => o.id === event.name) || { variables: []}).variables.length > 0,
                  'col-md-12': !((supported.events.find((o) => o.id === event.name) || { variables: []}).variables.length > 0)
               }"
          >
            <div class="card-header">{{translate('events.dialog.settings')}}</div>
            <div class="card-body">
              <div class="form-group col-md-12">
                <label for="type_selector">{{ translate('events.dialog.event') }}</label>
                <select class="form-control text-capitalize" v-model="event.name">
                  <option v-for="key of supported.events.map((o) => o.id)" :value="key" :key="key">{{translate(key)}}</option>
                </select>
              </div>
              <div class="form-group col-md-12" v-for="defKey of Object.keys(event.definitions)" :key="defKey">
                <label for="type_selector">{{ translate("events.definitions." + defKey + ".label") }}</label>
                <template v-if="typeof event.definitions[defKey] === 'boolean'">
                  <button type="button" class="btn btn-success" v-if="event.definitions[defKey]" @click="event.definitions[defKey] = false">{{translate("dialog.buttons.yes")}}</button>
                  <button type="button" class="btn btn-danger" v-else @click="event.definitions[defKey] = true">{{translate("dialog.buttons.no")}}</button>
                </template>
                <input v-else v-model="event.definitions[defKey]" :class="{ 'is-invalid': getDefinitionValidation(defKey).$invalid }" type="text" class="form-control" :id="defKey + '_input'" :placeholder="translate('events.definitions.' + defKey + '.placeholder')">
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
                <textarea v-model="event.filter" class="form-control"/>
              </div>
            </div>
          </div>
          <div class="card col-md-6 mb-3 p-0" v-if="(supported.events.find((o) => o.id === event.name) || { variables: []}).variables.length > 0">
            <div class="card-header">{{translate('events.dialog.usable-events-variables')}}</div>
            <div class="card-body">
              <div class="form-group col-md-12 m-0">
                <dl class="row m-0" style="font-size:0.7rem;">
                  <template v-for="variables of (supported.events.find((o) => o.id === event.name) || { variables: []}).variables">
                    <dt class="col-4" :key="variables + '1'">${{variables}}</dt>
                    <dd class="col-8" :key="variables + '2'">{{translate('responses.variable.' + variables) }}</dd>
                  </template>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <h3>{{translate('events.dialog.operations')}}</h3>
        <div class="row no-gutters pl-3 pr-3" v-for="(operation, index) of event.operations" :key="operation.name + index"
            :class="{'pt-2': index !== 0}">
          <div class="card col-12">
            <div class="card-body">
              <div class="form-group col-md-12">
                <select class="form-control text-capitalize" v-model="operation.name">
                  <option v-for="key of supported.operations.map((o) => o.id)" :value="key" :key="key">{{translate(key)}}</option>
                </select>
                <div v-for="(defKey, indexDef) of Object.keys(operation.definitions)" :key="defKey"
                  class="mt-2"
                  :class="{'pt-2': indexDef === 0}">

                  <label for="type_selector">{{ translate("events.definitions." + defKey + ".label") }}</label>
                  <template v-if="supported.operations.find(o => o.id === operation.name)">
                    <textarea-with-tags
                      v-if="['messageToSend', 'commandToRun'].includes(defKey)"
                      :value.sync="operation.definitions[defKey]"
                      :placeholder="translate('events.definitions.' + defKey + '.placeholder')"
                      :error="null"
                      :filters="['global', ...(supported.events.find((o) => o.id === event.name) || { variables: []}).variables]"
                      @update="operation.definitions[defKey] = $event"
                    />
                    <select class="form-control"
                            v-else-if="Array.isArray(supported.operations.find(o => o.id === operation.name).definitions[defKey])" v-model="operation.definitions[defKey]">
                      <option v-for="value of supported.operations.find(o => o.id === operation.name).definitions[defKey]" :key="value">{{value}}</option>
                    </select>
                    <input v-else-if="typeof operation.definitions[defKey] === 'string'" type="text" class="form-control" v-model="operation.definitions[defKey]" :placeholder="translate('events.definitions.' + defKey + '.placeholder')"/>
                    <template v-else-if="typeof operation.definitions[defKey] === 'boolean'">
                      <button type="button" class="btn btn-success" v-if="operation.definitions[defKey]" @click="operation.definitions[defKey] = false">{{translate("dialog.buttons.yes")}}</button>
                      <button type="button" class="btn btn-danger" v-else @click="operation.definitions[defKey] = true">{{translate("dialog.buttons.no")}}</button>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, getCurrentInstance } from '@vue/composition-api'
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import { v4 as uuid } from 'uuid';
import { cloneDeep, get } from 'lodash-es';
import { validationMixin } from 'vuelidate'
import { required, requiredIf, minValue } from "vuelidate/lib/validators";

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { getSocket } from '../../../helpers/socket';

import { EventInterface, EventOperationInterface } from 'src/bot/database/entity/event';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import translate from 'src/panel/helpers/translate';
import { error } from 'src/panel/helpers/error';

const socket = getSocket('/core/events');

export default defineComponent({
  mixins: [ validationMixin ],
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'font-awesome-layers': FontAwesomeLayers,
  },
  beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
    if (this.state.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  },
  beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
    if (this.state.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  },
  validations: {
    event: {
      givenName: {
        required,
      },
      definitions: {
        fadeOutXCommands: {
          required: requiredIf(function (model) {
            return typeof model.fadeOutXCommands !== 'undefined'
          }),
          minValue: minValue(0)
        },
        fadeOutInterval: {
          required: requiredIf(function (model) {
            return typeof model.fadeOutInterval !== 'undefined'
          }),
          minValue: minValue(0)
        },
        runEveryXCommands: {
          required: requiredIf(function (model) {
            return typeof model.runEveryXCommands !== 'undefined'
          }),
          minValue: minValue(0)
        },
        runEveryXKeywords: {
          required: requiredIf(function (model) {
            return typeof model.runEveryXKeywords !== 'undefined'
          }),
          minValue: minValue(0)
        },
        fadeOutXKeywords: {
          required: requiredIf(function (model) {
            return typeof model.fadeOutXKeywords !== 'undefined'
          }),
          minValue: minValue(0)
        },
        runInterval: {
          required: requiredIf(function (model) {
            return typeof model.runInterval !== 'undefined'
          }),
          minValue: minValue(0)
        },
        commandToWatch: {
          required: requiredIf(function (model) {
            return typeof model.commandToWatch !== 'undefined'
          }),
        },
        keywordToWatch: {
          required: requiredIf(function (model) {
            return typeof model.keywordToWatch !== 'undefined'
          }),
        },
        runAfterXMinutes: {
          required: requiredIf(function (model) {
            return typeof model.runAfterXMinutes !== 'undefined'
          }),
          minValue: minValue(1)
        },
        runEveryXMinutes: {
          required: requiredIf(function (model) {
            return typeof model.runEveryXMinutes !== 'undefined'
          }),
          minValue: minValue(1)
        },
        viewersAtLeast: {
          required: requiredIf(function (model) {
            return typeof model.viewersAtLeast !== 'undefined'
          }),
          minValue: minValue(0)
        }
      }
    },
  },
  setup(props, ctx) {
    const instance = getCurrentInstance();
    const eventId = ctx.root.$route.params.id || uuid();
    const event = ref({
      id: eventId,
      name: '',
      givenName: '',
      isEnabled: true,
      triggered: {},
      definitions: {},
      operations: [],
      filter: '',
    } as EventInterface);
    const operationsClone = ref([] as Omit<EventOperationInterface, 'event'>[]);
    const watchOperationChange = ref(true);
    const watchEventChange = ref(true);
    const supported = ref({ operations: [], events: [] } as {
        operations: Events.SupportedOperation[],
        events: Events.SupportedEvent[]
    });
    const state = ref({
      load: ButtonStates.progress,
      save: ButtonStates.idle,
      pending: false } as { load: number, save: number, pending: boolean })


    watch(event, () => {
      if (state.value.load === ButtonStates.success) {
        state.value.pending = true;
      }
    }, { deep: true })
    watch(() => event.value.operations, (val: Omit<EventOperationInterface, 'event'>[]) => {
      if (state.value.load !== ButtonStates.success) {
        return;
      }
      for (const v of val) {
        console.log('event', v)
      }
      if (!watchOperationChange.value) return true;
      watchOperationChange.value = false // remove watch

      // remove all do-nothing
      val = val.filter((o) => o.name !== 'do-nothing');

      // add do-nothing at the end
      val.push({
        id: uuid(),
        name: 'do-nothing',
        definitions: {}
      });

      for (let i = 0; i < val.length; i++) {
        if (typeof operationsClone.value[i] !== 'undefined' && val[i].name === operationsClone.value[i].name) continue

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
      }

      // update clone
      event.value.operations = cloneDeep(val)
      ctx.root.$nextTick(() => (watchOperationChange.value = true)) // re-enable watch
      operationsClone.value = cloneDeep(val)
    }, { deep: true });
    watch(() => event.value.name, (val, oldVal) => {
      if (!watchEventChange.value) return;
      watchEventChange.value = false;

      if (val !== oldVal) {
        event.value.definitions = {}; // reload definitions

        const defaultEvent = supported.value.events.find((o) => o.id === val)
        if (defaultEvent) {
          if (defaultEvent.definitions) {
            event.value.definitions = defaultEvent.definitions;
          }
        }
      }
      ctx.root.$nextTick(() => {
        watchEventChange.value = true;
      })
    }, { deep: true });

    onMounted(async () => {
      await Promise.all([
        new Promise((resolve, reject) => {
          if (ctx.root.$route.params.id) {
            socket.emit('generic::getOne', ctx.root.$route.params.id, (err: string | null, eventGetAll: Required<EventInterface>) => {
              if (err) {
                reject(error(err));
              }
              watchEventChange.value = false;

              if (eventGetAll.operations.length === 0 || eventGetAll.operations[eventGetAll.operations.length - 1].name !== 'do-nothing') {
                eventGetAll.operations.push({
                  id: uuid(),
                  name: 'do-nothing',
                  definitions: {}
                });
              }

              event.value.id = eventGetAll.id;
              operationsClone.value = cloneDeep(eventGetAll.operations);
              event.value.operations = eventGetAll.operations;
              event.value.name = eventGetAll.name;
              event.value.givenName = eventGetAll.givenName;
              event.value.isEnabled = eventGetAll.isEnabled;
              event.value.triggered = { ...eventGetAll.triggered };
              event.value.definitions = { ...eventGetAll.definitions };
              event.value.filter = eventGetAll.filter;

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
              event.value.operations.push({
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
              event.value.name = supported.value.events[0].id
            }
            resolve();
          })
        }),
      ]);
      state.value.load = ButtonStates.success;
    });

    const getDefinitionValidation = (key: string) => {
      const $v = instance?.$v;
      return get($v, 'event.definitions.' + key, { $invalid: false });
    };
    const del = () => {
      socket.emit('events::remove', event.value, (err: string | null) => {
        if (err) {
          return error(err);
        }
        ctx.root.$router.push({ name: 'EventsManagerList' }).catch(() => {});
      })
    };
    const save = () => {
      const $v = instance?.$v;
      $v?.$touch();
      if (!$v?.$invalid) {
        state.value.save = ButtonStates.progress;
        socket.emit('events::save', event.value, (err: string | null, eventId: string) => {
          if (err) {
            state.value.save = ButtonStates.fail;
            error(err)
          } else {
            state.value.save = ButtonStates.success;
            ctx.root.$router.push({ name: 'EventsManagerEdit', params: { id: event.value.id || '' } }).catch(() => {})
          }
          state.value.pending = false;
          setTimeout(() => {
            state.value.save = ButtonStates.idle;
          }, 1000)
        })
      }
    }

    return {
      get,
      event,
      operationsClone,
      watchOperationChange,
      watchEventChange,
      state,
      supported,
      getDefinitionValidation,
      del,
      save,
    }
  }
})
</script>