<template>
  <div class="container-fluid" ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.event-listeners') }}
          <template v-if="search.length > 0">
            <small>
              <fa icon="search"/>
            </small>
            {{ search }}
          </template>
        </span>
      </b-col>
    </b-row>

    <panel cards search @search="search = $event">
      <template v-slot:left>
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/events/edit">{{translate('events.dialog.title.new')}}</button-with-icon>
      </template>
    </panel>

    <div class="text-center" v-if="state.loading === 1">
      <fa icon="circle-notch" spin class="text-primary" size="3x" />
    </div>
    <div class="alert alert-info" v-else-if="state.loading === 0 && events.length === 0">
      {{translate('events.noEvents')}}
    </div>
    <div class="alert alert-danger" v-else-if="state.loading === 0 && filteredEvents.length === 0 && search.length > 0">
      <fa icon="search" />
      {{translate('events.noEventsAfterSearch')}}
    </div>
    <div v-else>
      <transition-group
          name="staggered-fade"
          tag="span"
          v-bind:css="false"
          v-on:before-enter="beforeEnter"
          v-on:enter="enter"
          v-on:leave="leave">
        <div v-for="(event, i) of filteredEvents"
            v-bind:data-id="event.id"
            v-bind:data-index="i"
            class="card"
            :class="{
              'mt-3': i > 0,
            }"
            :key="event.id">
          <div class="card-body pt-0 ">
            <small class="text-muted text-monospace" style="text-transform: initial; font-size: 0.5rem;">{{ event.id }}</small>
            <h5 class="card-title">{{ event.givenName }} <small class="text-muted" style="text-transform: initial;">{{ event.key }}</small></h5>

            <div class="btn btn-secondary btn-with-icon btn-shrink btn-reverse" :title="event.filter">
              <div style="display: flex">
                <div class="text" v-if="event.filter.length > 0">
                  {{ event.filter }}
                </div>
                <div class="btn-icon">
                  <font-awesome-layers v-if="event.filter.length === 0">
                    <fa icon="slash" :mask="['fas', 'filter']" />
                    <fa icon="slash" transform="down-2 left-2"/>
                  </font-awesome-layers>
                  <fa icon="filter" v-else/>
                </div>
              </div>
            </div>

            <template v-if="Object.keys(event.definitions).length > 0">
              <button-with-icon
                v-if="isSettingsShown(event.id)"
                :text="translate('events.dialog.settings')"
                @click="toggleSettingsShow(event.id)"
                class="btn-dark btn-shrink btn-reverse"
                icon="cog"/>
              <button-with-icon
                v-else
                :text="translate('events.dialog.settings')"
                @click="toggleSettingsShow(event.id)"
                class="btn-light btn-shrink btn-reverse"
                icon="cog"/>
            </template>

            <button-with-icon
              v-if="isOperationShown(event.id)"
              :text="translate('events.dialog.operations') + ' (' + event.operations.length + ')'"
              @click="toggleOperationShow(event.id)"
              class="btn-dark btn-shrink btn-reverse"
              icon="tasks"
              />
            <button-with-icon
              v-else
              :text="translate('events.dialog.operations') + ' (' + event.operations.length + ')'"
              @click="toggleOperationShow(event.id)"
              class="btn-light btn-shrink btn-reverse"
              icon="tasks"
              />

            <div v-if="isSettingsShown(event.id)" class="pt-2">
              <h6 class="text-muted">{{translate('events.dialog.settings')}}</h6>
              <dl class="row" style="font-size:0.8rem;">
                <template v-for="key of Object.keys(event.definitions)">
                  <dt class="col-sm-6" :key="event.id + key + '0'">{{translate('events.definitions.' + key + '.label')}}</dt>
                  <dd class="col-sm-6" :key="event.id + key + '1'">{{event.definitions[key]}}</dd>
                </template>
              </dl>
            </div>

            <div v-if="isOperationShown(event.id)">
              <h6 class="text-muted">{{translate('events.dialog.operations')}}</h6>
              <template v-for="operation of event.operations">
                <strong :key="event.id + operation.name + '4'" class="text-uppercase text-narrow">{{translate(operation.name)}}</strong>
                <dl class="row" :key="event.id + operation.name + '5'" style="font-size:0.8rem;">
                <template v-for="key of Object.keys(operation.definitions)">
                  <dt class="col-sm-6" :key="event.id + key + '2'">{{translate('events.definitions.' + key + '.label')}}</dt>
                  <dd class="col-sm-6" :key="event.id + key + '3'">{{operation.definitions[key]}}</dd>
                </template>
                </dl>
              </template>
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

            <hold-button class="btn-danger btn-shrink" @trigger="deleteEvent(event)" icon="trash">
              <template slot="title">{{translate('dialog.buttons.delete')}}</template>
              <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
            </hold-button>
          </div>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
  import { gsap } from 'gsap'

  import { getSocket } from '../../../helpers/socket';

  import { EventInterface } from 'src/bot/database/entity/event';

  export default Vue.extend({
    components: {
      'font-awesome-layers': FontAwesomeLayers,
    },
    data: function () {
      const object: {
        socket: any,
        events: EventInterface[],
        search: string,
        showOperationsOfEvent: string[],
        showSettingsOfEvent: string[],
        testingInProgress: {[x:string]: number},
        deletionInProgress: {[x:string]: number},
        heightOfElement: {[x:string]: any},
        state: {
          loading: number,
        }
      } = {
        socket: getSocket('/core/events'),
        events: [],
        search: '',
        showOperationsOfEvent: [],
        showSettingsOfEvent: [],
        heightOfElement: [],
        testingInProgress: {},
        deletionInProgress: {},
        state: {
          loading: this.$state.progress
        }
      }
      return object
    },
    computed: {
      filteredEvents(): EventInterface[] {
        let events = this.events
        if (this.search.trim() !== '') {
          events = this.events.filter((o) => {
            return o.name.trim().toLowerCase().includes(this.search.trim().toLowerCase())
          })
        }
        return events.sort((a, b) => {
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
      },
    },
    mounted() {
      this.socket.emit('generic::getAll', (err: string | null, data: EventInterface[]) => {
        if (err) {
          return console.error(err);
        }
        this.events = data;
        this.state.loading = this.$state.idle;
      });
    },
    methods: {
      beforeEnter: function (el: HTMLElement) {
        el.style.opacity = '0'
        el.style.height = '0'
      },
      enter: function (el: HTMLElement, done: () => void) {
        var delay = Number(el.dataset.index) * 150
        setTimeout(() => {
          gsap.to(el, { duration: 1, opacity: 1, height: this.heightOfElement[String(el.dataset.id)] || '100%', onComplete: () => {
            if (!this.heightOfElement[String(el.dataset.id)]) {
              el.style.height = 'inherit'; // reset to null if not defined
            }
            done()
           } })
        }, delay)
      },
      leave: function (el: HTMLElement, done: () => void) {
        this.heightOfElement[String(el.dataset.id)] = el.getBoundingClientRect().height + 'px'
        var delay = Number(el.dataset.index) * 150
        setTimeout(() => {
          gsap.to(el, { duration: 1, opacity: 0, height: 0, onComplete: done })
        }, delay)
      },
      deleteEvent(event: EventInterface) {
        this.socket.emit('events::remove', event, (err: string | null) => {
          if (err) {
            return console.error(err);
          }
          this.events = this.events.filter((o) => o.id !== event.id)
        })
      },
      triggerTest(id: string) {
        this.$set(this.testingInProgress, id, 1);
        this.socket.emit('test.event', id, () => {
          this.$set(this.testingInProgress, id, 2);
          setTimeout(() => {
            this.$set(this.testingInProgress, id, 0);
          }, 1000)
        });
      },
      sendUpdate(event: EventInterface) {
        this.socket.emit('events::save', event, (err: string | null) => {
          if (err) {
            console.error(err);
          }
        })
      },
      isSettingsShown(id: string) {
        return this.showSettingsOfEvent.includes(id)
      },
      isOperationShown(id: string) {
        return this.showOperationsOfEvent.includes(id)
      },
      toggleSettingsShow(id: string) {
        if (this.showSettingsOfEvent.includes(id)) {
          this.showSettingsOfEvent = this.showSettingsOfEvent.filter((o) => o !== id);
        } else {
          this.showSettingsOfEvent.push(id);
        }
      },
      toggleOperationShow(id: string) {
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
