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
          <div class="card col-md-6 mb-3 p-0">
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
          <div class="card col-md-6 mb-3 p-0">
            <div class="card-header">{{translate('events.dialog.usable-events-variables')}}</div>
            <div class="card-body">
              <div class="form-group col-md-12 m-0" v-if="(supported.events.find((o) => o.id === event.key) || { variables: []}).variables.length > 0">
                <dl class="row m-0" style="font-size:0.7rem;">
                  <template v-for="variables of (supported.events.find((o) => o.id === event.key) || { variables: []}).variables">
                    <dt class="col-4" :key="variables">${{variables}}</dt>
                    <dd class="col-8" :key="variables">{{translate('responses.variable.' + variables) }}</dd>
                  </template>
                </dl>
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

  import * as io from 'socket.io-client';

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

      this.socket.emit('list.supported.operations', (err, data: Events.Operation[]) => {
        if (err) return console.error(err);
        this.$set(this.supported, 'operations', data);
      })

      this.socket.emit('list.supported.events', (err, data: Events.SupportedEvent[]) => {
        if (err) return console.error(err);
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
      del() {
        console.log('deleting')
      },
      save() {
        console.log('saving')
      }
    }
  })
</script>

<style scoped>

</style>
