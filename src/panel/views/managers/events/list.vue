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
    <div v-for="(event, i) of filteredEvents"
         class="card"
         :class="{
           'mt-3': i > 0,
         }"
         :key="event.id">
      <div class="card-body">
        <h5 class="card-title">{{ event.name }} <small class="text-muted" style="text-transform: initial;">{{ event.id }}</small></h5>

        <div class="btn btn-secondary btn-with-icon btn-shrink btn-reverse" :title="getFiltersOfEvent(event.id)">
          <div style="display: flex">
            <div class="text" v-if="getFiltersOfEvent(event.id).length > 0">
              {{ getFiltersOfEvent(event.id) }}
            </div>
            <div class="btn-icon">
              <font-awesome-layers v-if="getFiltersOfEvent(event.id).length === 0">
                <fa icon="slash" :mask="['fas', 'filter']" />
                <fa icon="slash" transform="down-2 left-2"/>
              </font-awesome-layers>
              <fa icon="filter" v-else/>
            </div>
          </div>
        </div>

        <button-with-icon
          v-if="isOperationShown(event.id)"
          :text="translate('manage.events.operations') + ' (' + getOperationsOfEvent(event.id).length + ')'"
          @click="toggleOperationShow(event.id)"
          class="btn-dark btn-shrink btn-reverse"
          icon="eye"
          />
        <button-with-icon
          v-else
          :text="translate('manage.events.operations') + ' (' + getOperationsOfEvent(event.id).length + ')'"
          @click="toggleOperationShow(event.id)"
          class="btn-light btn-shrink btn-reverse"
          icon="eye"
          />

        <div v-if="isOperationShown(event.id)">
          {{ getOperationsOfEvent(event.id) }}
        </div>
      </div>
      <div class="card-footer text-right">
        <button-with-icon
          v-if="event.enabled"
          :text="translate('dialog.buttons.enabled')"
          @click="event.enabled = false; sendUpdate(event);"
          class="btn-success btn-shrink"
          icon="toggle-on"
          />
        <button-with-icon
          v-else
          :text="translate('dialog.buttons.disabled')"
          @click="event.enabled = true; sendUpdate(event);"
          class="btn-danger btn-shrink"
          icon="toggle-off"
          />

        <button-with-icon
          :text="translate('dialog.buttons.test')"
          @click="console.log('click')"
          class="btn-secondary btn-shrink"
          :icon="['far', 'bell']"
          />

        <button-with-icon
          :text="translate('dialog.buttons.edit')"
          :href="'#/manage/events/edit/' + event.id"
          class="btn-primary btn-shrink"
          icon="edit"
          />

        <hold-button class="btn-danger btn-shrink" @trigger="console.log('trigger')" icon="trash">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </div>
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
