<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.events') }}
        </span>
      </div>
    </div>

    <panel ref="panel" class="pt-3 pb-3 mt-3 mb-3 m-0 border-top border-bottom row"
      :options="{
        leftButtons: [
          {
            href: '#/registry/events/edit',
            text: translate('managers.events.addNewEvent'),
            class: 'btn-primary',
            icon: 'plus'
          }
        ],
        hideTableButton: true
      }"
      @search="search = $event"></panel>
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
        events: Events.Event[],
        filters: Events.Filter[],
        operations: Events.Operation[],
        search: string,
        showOperationsOfEvent: string[],
      } = {
        socket: io('/core/events', { query: "token=" + this.token }),
        events: [],
        filters: [],
        operations: [],
        search: '',
        showOperationsOfEvent: [],
      }
      return object
    },
    computed: {
      filteredEvents(): Events.Event[] {
        if (this.search.trim() !== '') {
          return this.events.filter((o) => {
            return o.name.trim().toLowerCase().includes(this.search.trim().toLowerCase())
          })
        } else {
          return this.events;
        }
      },
    },
    mounted() {
      this.socket.emit('find', { collection: '_events' }, (err, data: Events.Event[]) => {
        if (err) return console.error(err);
        this.events = data;
      })
      this.socket.emit('find', { collection: '_events.operations' }, (err, data: Events.Operation[]) => {
        if (err) return console.error(err);
        this.operations = data;
      })
      this.socket.emit('find', { collection: '_events.filters' }, (err, data: Events.Filter[]) => {
        if (err) return console.error(err);
        this.filters = data;
      })
    },
    methods: {
      sendUpdate(event) {
        this.socket.emit('update', { collection: '_events', items: [event] })
      },
      getOperationsOfEvent(id) {
        return this.operations.filter((o) => o.eventId === id)
      },
      getFiltersOfEvent(id) {
        return this.filters.filter((o) => o.eventId === id).map((o => {
          return o.filters
        })).join(' ');
      },
      isOperationShown(id) {
        return this.showOperationsOfEvent.includes(id)
      },
      toggleOperationShow(id) {
        if (this.showOperationsOfEvent.includes(id)) {
          this.showOperationsOfEvent = this.showOperationsOfEvent.filter((o) => o !== id);
        } else {
          this.showOperationsOfEvent.push(id);
        }
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

.btn-reverse > div {
  flex-direction: row-reverse !important;
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
