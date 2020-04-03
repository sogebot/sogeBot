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
      <template v-slot:right>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$invalid"/>
      </template>
    </panel>

    <div class="pt-3">
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
                      :error="false"
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
  import Vue from 'vue'
  import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
  import { v4 as uuid } from 'uuid';
  import { cloneDeep, get } from 'lodash-es';
  import { required, requiredIf, minValue } from "vuelidate/lib/validators";

  import { getSocket } from '../../../helpers/socket';

  import { EventInterface, EventOperationInterface } from 'src/bot/database/entity/event';

  export default Vue.extend({
    components: {
      'font-awesome-layers': FontAwesomeLayers,
    },
    data: function () {
      const eventId = uuid();
      const object: {
        get: any,
        eventId: string,
        socket: any,
        event: EventInterface,
        operationsClone: EventOperationInterface[], // used as oldVal to check what actually ichanged
        watchOperationChange: boolean,
        watchEventChange: boolean,

        supported: {
          operations: Events.SupportedOperation[],
          events: Events.SupportedEvent[]
        },

        state: {
          save: number
        }
      } = {
        get: get,
        eventId: this.$route.params.id || eventId,
        socket: getSocket('/core/events'),
        event: {
          id: eventId,
          name: '',
          givenName: '',
          isEnabled: true,
          triggered: {},
          definitions: {},
          operations: [],
          filter: '',
        },
        operationsClone: [],
        watchOperationChange: true,
        watchEventChange: true,

        supported: {
          operations: [],
          events: [],
        },

        state: {
          save: 0
        }
      }
      return object
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
    watch: {
      'event.operations': {
        handler: function (val) {
          for (const v of val) {
            console.log('event', v)
          }
          if (!this.watchOperationChange) return true;
          this.watchOperationChange = false // remove watch

          // remove all do-nothing
          val = val.filter((o) => o.name !== 'do-nothing');

          // add do-nothing at the end
          val.push({
            id: uuid(),
            name: 'do-nothing',
            definitions: {}
          });

          for (let i = 0; i < val.length; i++) {
            if (typeof this.operationsClone[i] !== 'undefined' && val[i].name === this.operationsClone[i].name) continue

            val[i].definitions = {}
            const defaultOperation = this.supported.operations.find((o) => o.id === val[i].name)
            if (defaultOperation) {
              if (Object.keys(defaultOperation.definitions).length > 0) {
                val[i].definitions = cloneDeep(defaultOperation.definitions);
                for (const key of Object.keys(val[i].definitions)) {
                  if (Array.isArray(val[i].definitions[key])) {
                    val[i].definitions[key] = val[i].definitions[key][0] // select first option by default
                  }
                }
                this.$forceUpdate()
              }
            }
          }

          // update clone
          this.event.operations = cloneDeep(val)
          this.$nextTick(() => (this.watchOperationChange = true)) // re-enable watch
          this.operationsClone = cloneDeep(val)
        },
        deep: true
      },
      'event.name': {
        handler: function (val, oldVal) {
          if (!this.watchEventChange) return;

          this.watchEventChange = false;

          if (val !== oldVal) {
            this.$set(this.event, 'definitions', {}) // reload definitions

            const defaultEvent = this.supported.events.find((o) => o.id === val)
            if (defaultEvent) {
              if (defaultEvent.definitions) {
                this.$set(this.event, 'definitions', defaultEvent.definitions)
              }
            }
          }
          this.$nextTick(() => {
            this.watchEventChange = true;
          })
        },
        deep: true,
      }
    },
    mounted() {
      if (this.$route.params.id) {
        this.socket.emit('events::getOne', this.$route.params.id, (err, event: Required<EventInterface>) => {
          if (err) {
            return console.error(err);
          }
          this.watchEventChange = false;

          if (event.operations[event.operations.length - 1].name !== 'do-nothing') {
            event.operations.push({
              id: uuid(),
              name: 'do-nothing',
              definitions: {},
              event,
            });
          }

          this.event.id = event.id;
          this.operationsClone = cloneDeep(event.operations);
          this.event.operations = event.operations;
          this.event.name = event.name;
          this.event.givenName = event.givenName;
          this.event.isEnabled = event.isEnabled;
          this.event.triggered = { ...event.triggered };
          this.event.definitions = { ...event.definitions };
          this.event.filter = event.filter;

          console.debug('Loaded', this.event);

          this.$nextTick(() => (this.watchEventChange = true));
        });
      }

      this.socket.emit('list.supported.operations', (err, data: Events.SupportedOperation[]) => {
        if (err) return console.error(err);
        data.push({ // add do nothing - its basicaly delete of operation
          id: 'do-nothing',
          definitions: {},
          fire: () => {},
        })
        this.$set(
          this.supported,
          'operations',
          data.sort((a, b) => {
            const A = this.translate(a.id).toLowerCase();
            const B = this.translate(b.id).toLowerCase();
            if (A < B || a.id === 'do-nothing')  { //sort string ascending
              return -1;
            }
            if (A > B || b.id === 'do-nothing') {
              return 1;
            }
            return 0; //default return value (no sorting)
          })
        );

        if (!this.$route.params.id) {
          // set first operation if we are in create mode
          this.event.operations.push({
            id: uuid(),
            name: 'do-nothing',
            definitions: {},
            event: this.event,
          });
        }

      })

      this.socket.emit('list.supported.events', (err, data: Events.SupportedEvent[]) => {
        if (err) return console.error(err);

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
        this.$set(
          this.supported,
          'events',
          data.sort((a, b) => {
            const A = this.translate(a.id).toLowerCase();
            const B = this.translate(b.id).toLowerCase();
            if (A < B)  { //sort string ascending
              return -1;
            }
            if (A > B) {
              return 1;
            }
            return 0; //default return value (no sorting)
          })
        );
        if (!this.$route.params.id) {
          // set first event if we are in create mode
          this.event.name = this.supported.events[0].id
        }
      })
    },
    methods: {
      getDefinitionValidation(key) {
        return get(this, '$v.event.definitions.' + key, { $invalid: false });
      },
      del: function () {
        this.socket.emit('events::remove', this.event, (err) => {
          if (err) {
            return console.error(err);
          }
          this.$router.push({ name: 'EventsManagerList' })
        })
      },
      save() {
        this.state.save = 1;
        this.socket.emit('events::save', this.event, (err, eventId) => {
          if (err) {
            this.state.save = 3
          } else {
            this.state.save = 2
            this.$router.push({ name: 'EventsManagerEdit', params: { id: this.event.id || '' } })
          }
          setTimeout(() => {
            this.state.save = 0
          }, 1000)
        })
      }
    }
  })
</script>