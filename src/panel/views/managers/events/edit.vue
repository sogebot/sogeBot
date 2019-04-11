<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.event-listeners') }}
          <small><i class="fas fa-angle-right"></i></small>
          <template v-if="$route.params.id">
            {{event.name}}
            <small>{{$route.params.id}}</small>
          </template>
        </span>
      </div>
    </div>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/manage/events/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button :if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-danger">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
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
          <input v-model="event.name" type="text" class="form-control" :class="{ 'is-invalid': $v.event.name.$invalid }" id="name_input">
          <div class="invalid-feedback">
            {{translate('dialog.errors.required')}}
          </div>
        </div>

        <div class="row no-gutters pl-3 pr-3">
          <div class="card mb-3 p-0"
               :class="{
                  'col-md-6': (supported.events.find((o) => o.id === event.key) || { variables: []}).variables.length > 0,
                  'col-md-12': !((supported.events.find((o) => o.id === event.key) || { variables: []}).variables.length > 0)
               }"
          >
            <div class="card-header">{{translate('events.dialog.settings')}}</div>
            <div class="card-body">
              <div class="form-group col-md-12">
                <label for="type_selector">{{ translate('events.dialog.event') }}</label>
                <select class="form-control text-capitalize" v-model="event.key">
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
                  <template v-if="!_.get(getDefinitionValidation(defKey), 'minValue', true)">
                    {{translate('dialog.errors.minValue').replace('$value', _.get(getDefinitionValidation(defKey), '$params.minValue.min', 0)) }}
                  </template>
                  <template v-else>
                    {{translate('dialog.errors.required')}}
                  </template>
                </div>
              </div>
              <div class="form-group col-md-12">
                <label for="type_selector">{{ translate("events.dialog.filters") }}</label>
                <textarea v-model="filters" class="form-control"/>
              </div>
            </div>
          </div>
          <div class="card col-md-6 mb-3 p-0" v-if="(supported.events.find((o) => o.id === event.key) || { variables: []}).variables.length > 0">
            <div class="card-header">{{translate('events.dialog.usable-events-variables')}}</div>
            <div class="card-body">
              <div class="form-group col-md-12 m-0">
                <dl class="row m-0" style="font-size:0.7rem;">
                  <template v-for="variables of (supported.events.find((o) => o.id === event.key) || { variables: []}).variables">
                    <dt class="col-4" :key="variables + '1'">${{variables}}</dt>
                    <dd class="col-8" :key="variables + '2'">{{translate('responses.variable.' + variables) }}</dd>
                  </template>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <h3>{{translate('events.dialog.operations')}}</h3>
        <transition-group name="fade">
          <div class="row no-gutters pl-3 pr-3" v-for="(operation, index) of operations" :key="operation.key + index"
              :class="{'pt-2': index !== 0}">
            <div class="card col-12">
              <div class="card-body">
                <div class="form-group col-md-12">
                  <select class="form-control text-capitalize" v-model="operation.key">
                    <option v-for="key of supported.operations.map((o) => o.id)" :value="key" :key="key">{{translate(key)}}</option>
                  </select>

                  <div v-for="(defKey, indexDef) of Object.keys(operation.definitions)" :key="defKey"
                    class="mt-2"
                    :class="{'pt-2': indexDef === 0}">

                    <label for="type_selector">{{ translate("events.definitions." + defKey + ".label") }}</label>
                    <textarea-with-tags
                      v-if="['messageToSend', 'commandToRun'].includes(defKey)"
                      :value="operation.definitions[defKey]"
                      :placeholder="translate('events.definitions.' + defKey + '.placeholder')"
                      :error="false"
                      :filters="['global', ...(supported.events.find((o) => o.id === event.key) || { variables: []}).variables]"
                      @change="operation.definitions[defKey] = $event"
                    />
                    <select class="form-control"
                            v-else-if="Array.isArray(supported.operations.find(o => o.id === operation.key).definitions[defKey])" v-model="operation.definitions[defKey]">
                      <option v-for="value of supported.operations.find(o => o.id === operation.key).definitions[defKey]" :key="value">{{value}}</option>
                    </select>
                    <input v-else-if="typeof operation.definitions[defKey] === 'string'" type="text" class="form-control" v-model="operation.definitions[defKey]" :placeholder="translate('events.definitions.' + defKey + '.placeholder')"/>
                    <template v-else-if="typeof operation.definitions[defKey] === 'boolean'">
                      <button type="button" class="btn btn-success" v-if="operation.definitions[defKey]" @click="operation.definitions[defKey] = false">{{translate("dialog.buttons.yes")}}</button>
                      <button type="button" class="btn btn-danger" v-else @click="operation.definitions[defKey] = true">{{translate("dialog.buttons.no")}}</button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition-group>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
  import uuid from 'uuid/v4';
  import { cloneDeep } from 'lodash';
  import { required, requiredIf, minValue } from "vuelidate/lib/validators";

  import io from 'socket.io-client';

  export default Vue.extend({
    components: {
      'font-awesome-layers': FontAwesomeLayers,
    },
    data: function () {
      const eventId = uuid();
      const object: {
        eventId: string,
        socket: any,
        event: Events.Event,
        filters: string,
        operations: Events.Operation[],
        operationsClone: Events.Operation[], // used as oldVal to check what actually ichanged
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
        eventId: this.$route.params.id || eventId,
        socket: io('/core/events', { query: "token=" + this.token }),
        event: {
          id: eventId,
          key: '',
          name: '',
          enabled: true,
          triggered: {},
          definitions: {}
        },
        filters: '',
        operations: [],
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
        name: {
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
      'operations': {
        handler: function (val) {
          if (!this.watchOperationChange) return;

          // remove all do-nothing
          val = val.filter((o) => o.key !== 'do-nothing');

          // add do-nothing at the end
          val.push({
            key: 'do-nothing',
            eventId: this.eventId,
            definitions: {}
          });

          for (let i = 0; i < val.length; i++) {
            if (typeof this.operationsClone[i] !== 'undefined' && val[i].key === this.operationsClone[i].key) continue

            val[i].definitions = {}
            const defaultOperation = this.supported.operations.find((o) => o.id === val[i].key)
            if (defaultOperation) {
              if (defaultOperation.definitions) {
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
          this.watchOperationChange = false // remove watch
          this.operations = val
          this.$nextTick(() => (this.watchOperationChange = true)) // re-enable watch
          this.operationsClone = cloneDeep(val)
        },
        deep: true
      },
      'event.key': function (val) {
        if (!this.watchEventChange) return;

        this.$set(this.event, 'definitions', {}) // reload definitions

        const defaultEvent = this.supported.events.find((o) => o.id === val)
        if (defaultEvent) {
          if (defaultEvent.definitions) {
            this.$set(this.event, 'definitions', defaultEvent.definitions)
          }
        }
      }
    },
    mounted() {
      if (this.$route.params.id) {
        this.socket.emit('findOne', { collection: '_events', where: { id: this.$route.params.id } }, (err, data: Events.Event) => {
          if (err) return console.error(err);
          this.watchEventChange = false;
          this.$set(this.event, 'id', data.id);
          this.$set(this.event, 'key', data.key);
          this.$set(this.event, 'name', data.name);
          this.$set(this.event, 'enabled', data.enabled);
          this.$set(this.event, 'definitions', data.definitions);
          this.$nextTick(() => (this.watchEventChange = true));
        })
        this.socket.emit('find', { collection: '_events.operations', where: { eventId: this.$route.params.id } }, (err, data: Events.Operation[]) => {
          if (err) return console.error(err);
          this.operations = data;
          if (this.operations[this.operations.length - 1].key !== 'do-nothing') {
            this.operations.push({
              key: 'do-nothing',
              eventId: this.$route.params.id,
              definitions: {}
            });

            this.operationsClone = cloneDeep(this.operations)
          }
        })
        this.socket.emit('find', { collection: '_events.filters', where: { eventId: this.$route.params.id } }, (err, data: Events.Filter[]) => {
          if (err) return console.error(err);
          this.filters = data.filter((o) => o.eventId === this.$route.params.id).map((o => {
            return o.filters
          })).join(' ');;
        })
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
          this.operations.push({
            eventId: this.eventId,
            key: 'do-nothing',
            definitions: {},
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
          this.event.key = this.supported.events[0].id
        }
      })
    },
    methods: {
      getDefinitionValidation(key) {
        return this._.get(this, '$v.event.definitions.' + key, { $invalid: false });
      },
      del: function () {
        this.socket.emit('delete.event', this.event.id, (err, eventId) => {
          if (err) {
            return console.error(err);
          }
          this.$router.push({ name: 'EventsManagerList' })
        })
      },
      save() {
        this.state.save = 1;
        this.socket.emit('save.event', {
          event: this.event,
          operations: this.operations.filter((o) => o.key !== 'do-nothing'),
          filters: this.filters
        }, (err, eventId) => {
          if (err) {
            this.state.save = 3
          } else {
            this.state.save = 2
            console.log(this.state.save)
            this.$router.push({ name: 'EventsManagerEdit', params: { id: String(eventId) } })
          }
          setTimeout(() => {
            this.state.save = 0
          }, 1000)
        })
      }
    }
  })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 1s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
