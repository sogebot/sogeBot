<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.events') }}
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



  {{ event }}
  <br>
  {{ filters }}
  <br>
  {{ operations }}
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

        refresh: false,
        state: {
          save: 0
        }
      }
      return object
    },
    watch: {
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
