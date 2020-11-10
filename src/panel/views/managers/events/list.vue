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
        <button-with-icon class="btn-primary btn-reverse" icon="plus" href="#/manage/events/edit">{{translate('events.dialog.title.new')}}</button-with-icon>
      </template>
    </panel>

    <loading v-if="state.loading === ButtonStates.progress" />
    <div class="alert alert-info" v-else-if="state.loading === 0 && events.length === 0">
      {{translate('events.noEvents')}}
    </div>
    <div v-else>
      <div v-for="(type, idx) of eventTypes" v-bind:key="type + idx">
        <span class="title text-default mb-2" style="font-size: 20px !important;">{{capitalize(translate(type))}}</span>
        <div v-for="(event, i) of filteredEvents.filter(o => o.name === type)"
            v-bind:data-id="event.id"
            v-bind:data-index="i"
            class="card mb-3"
            :key="event.id">
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
import { defineComponent, ref, onMounted, computed } from '@vue/composition-api'
import { FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import translate from 'src/panel/helpers/translate';

import { getSocket } from 'src/panel/helpers/socket';

import { EventInterface } from 'src/bot/database/entity/event';
import { ButtonStates } from 'src/panel/helpers/buttonStates';
import { error } from 'src/panel/helpers/error';
import { capitalize } from 'src/panel/helpers/capitalize';

const socket = getSocket('/core/events');

export default defineComponent({
  components: {
    loading: () => import('src/panel/components/loading.vue'),
    'font-awesome-layers': FontAwesomeLayers,
  },
  setup(props, ctx) {
    const events = ref([] as EventInterface[]);

    const testingInProgress = ref({} as {[x:string]: number});
    const deletionInProgress = ref({} as {[x:string]: number});
    const heightOfElement = ref({} as {[x:string]: any});
    const state = ref({ loading: ButtonStates.progress } as { loading: number });

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
      socket.emit('generic::getAll', (err: string | null, data: EventInterface[]) => {
        if (err) {
          return error(err);
        }
        events.value = data;
        state.value.loading = ButtonStates.idle;
      });
    });
    const deleteEvent = (event: EventInterface) => {
      if (confirm(`Do you want to delete event for ${event.name} with ${event.operations.length} operation(s)?`)) {
        socket.emit('events::remove', event, (err: string | null) => {
          if (err) {
            return error(err);
          }
          events.value = events.value.filter((o) => o.id !== event.id)
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

      translate,
      capitalize,
      ButtonStates,
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
