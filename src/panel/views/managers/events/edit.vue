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

    <panel v-if="!refresh" ref="panel" class="pt-3 pb-3 mt-3 mb-3 m-0 border-top border-bottom row"
      :state="state"
      :options="{
        leftButtons: [
          {
            href: '#/manage/events/list',
            text: translate('manage.events.back'),
            class: 'btn-secondary',
            icon: 'caret-left'
          },
          {
            event: 'delete',
            hold: true,
            textWhenHold: translate('dialog.buttons.hold-to-delete'),
            text: translate('dialog.buttons.delete'),
            class: 'btn-danger btn-shrink',
            icon: 'trash',
            if: $route.params.id || null,
          }
        ],
        rightButtons: [
          {
            event: 'save',
            state: 'save',
            text: {
              0: translate('dialog.buttons.saveChanges.idle'),
              1: translate('dialog.buttons.saveChanges.progress'),
              2: translate('dialog.buttons.saveChanges.done')
            },
            class: 'btn-primary',
            icon: 'save'
          }
        ],
        hideTableButton: true,
        hideCardsButton: true,
        hideSearchInput: true,
      }"
      @save="save()"
      @delete="del()"
      @search="search = $event"></panel>



    <div class="pt-3">
      <form>
        <div class="form-group col-md-12">
          <label for="name_input">{{ translate('events.dialog.name') }}</label>
          <input v-model="event.name" type="text" class="form-control" id="name_input">
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
                <input v-model="event.definitions[defKey]" type="text" class="form-control" :id="defKey + '_input'" :placeholder="translate('events.definitions.' + defKey + '.placeholder')">
              </div>
              <div class="form-group col-md-12">
                <label for="type_selector">{{ translate("events.dialog.filters") }}</label>
                <textarea v-model="event.filters" class="form-control"/>
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

        <div class="row no-gutters pl-3 pr-3">
          <div class="card col-12">
            <div class="card-header p-1 pl-3">
              <span style="position: relative; top: 0.3rem">{{translate('events.dialog.operations')}}</span>
              <button-with-icon
                class="btn-primary btn-shrink float-right"
                icon="plus"
                @click="addOperation"
                :text="translate('manage.events.addOperation')"
              />
            </div>
            <div class="card-body">
              <div class="alert alert-info m-0" v-if="operations.length === 0">{{translate('manage.events.noOperationsFound')}}</div>
              <template v-else>
                <span v-for="(operation, index) of operations" :key="index">
                  <div class="form-group col-md-12">
                    <select class="form-control text-capitalize" v-model="operation.key">
                      <option v-for="key of supported.operations.map((o) => o.id)" :value="key" :key="key">{{translate(key)}}</option>
                    </select>

                    <div v-for="(defKey, indexDef) of Object.keys(operation.definitions)" :key="defKey"
                      class="mt-2"
                      :class="{'pt-2': indexDef === 0}">
                      <label for="type_selector">{{ translate("events.definitions." + defKey + ".label") }}</label>
                      <textarea-with-tags
                        v-if="typeof operation.definitions[defKey] === 'string'"
                        :value="operation.definitions[defKey]"
                        :placeholder="translate('events.definitions.' + defKey + '.placeholder')"
                        :error="false"
                        :filters="['global', ...(supported.events.find((o) => o.id === event.key) || { variables: []}).variables]"
                        @change="operation.definitions[defKey] = $event"
                      />
                      <template v-if="typeof operation.definitions[defKey] === 'boolean'">
                        <button type="button" class="btn btn-success" v-if="operation.definitions[defKey]" @click="operation.definitions[defKey] = false">{{translate("dialog.buttons.yes")}}</button>
                        <button type="button" class="btn btn-danger" v-else @click="operation.definitions[defKey] = true">{{translate("dialog.buttons.no")}}</button>
                      </template>
                    </div>
                  </div>
                  <hold-button @trigger="deleteOperation(operation)" icon="trash" class="btn-danger">
                    <template slot="title">{{translate('dialog.buttons.delete')}}</template>
                    <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
                  </hold-button>
                  <hr v-if="index !== operations.length - 1"/>
                </span>
              </template>
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

  import io from 'socket.io-client';

  export default Vue.extend({
    components: {
      'font-awesome-layers': FontAwesomeLayers,
    },
    data: function () {
      const object: {
        socket: any,
        event: Events.Event,
        filters: Events.Filter[],
        operations: Events.Operation[],

        supported: {
          operations: Events.Operation[],
          events: Events.Event[]
        },

        refresh: boolean,
        state: {
          save: number
        }
      } = {
        socket: io('/core/events', { query: "token=" + this.token }),
        event: {
          id: this.$route.params.id,
          key: '',
          name: '',
          enabled: true,
          triggered: {},
          definitions: {}
        },
        filters: [],
        operations: [],

        supported: {
          operations: [],
          events: [],
        },

        refresh: false,
        state: {
          save: 0
        }
      }
      return object
    },
    watch: {
      'event.key': function (val) {
        this.$set(this.event, 'definitions', {}) // reload definitions

        const defaultEvent = this.supported.events.find((o) => o.id === val)
        if (defaultEvent) {
          if (defaultEvent.definitions) {
            this.$set(this.event, 'definitions', defaultEvent.definitions)
          }
        }
      },
      refresh: function (val) {
        if (val) {
          this.$nextTick(() => (this.refresh = false))
        }
      },
    },
    mounted() {
      if (this.$route.params.id) {
        this.socket.emit('findOne', { collection: '_events', where: { id: this.$route.params.id } }, (err, data: Events.Event) => {
          if (err) return console.error(err);
          this.event = data;
        })
        this.socket.emit('find', { collection: '_events.operations', where: { eventId: this.$route.params.id } }, (err, data: Events.Operation[]) => {
          if (err) return console.error(err);
          this.operations = data;
        })
        this.socket.emit('find', { collection: '_events.filters', where: { eventId: this.$route.params.id } }, (err, data: Events.Filter[]) => {
          if (err) return console.error(err);
          this.filters = data;
        })
      }

      this.socket.emit('list.supported.operations', (err, data: Events.SupportedOperation[]) => {
        if (err) return console.error(err);
        this.$set(
          this.supported,
          'operations',
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
      })
    },
    methods: {
      deleteOperation(op) {
        console.log('deleting ' + op)
      },
      addOperation() {
        console.log('adding operations')
      },
      del() {
        console.log('deleting')
      },
      save() {
        console.log('saving')
      }
    }
  })
</script>