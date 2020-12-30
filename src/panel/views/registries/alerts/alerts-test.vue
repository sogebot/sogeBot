<template>
  <div>
    <b-form>
      <b-form-group id="event-type-input" label="Event:" label-for="event-type-input-select">
        <b-form-select
          id="event-type-input-select"
          v-model="event"
        >
          <b-form-select-option v-for="ev of events" :value="ev" :key="ev">
            {{ translate('registry.alerts.event.' + ev) }}
          </b-form-select-option>
        </b-form-select>
      </b-form-group>
      <b-form-group id="event-username-input" label="Username:" label-for="event-username-input-text">
        <b-input-group>
          <template #prepend>
            <b-button :variant="isUsernameRandomized ? 'success':'danger'" @click="isUsernameRandomized = !isUsernameRandomized">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shuffle" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
              </svg>
            </b-button>
          </template>
          <b-form-input
            id="event-username-input-text"
            v-model="username"
            placeholder="Enter username"
            :disabled="isUsernameRandomized"
          ></b-form-input>
        </b-input-group>
      </b-form-group>

      <b-form-group id="event-autohost-input" label="Autohost:" label-for="event-autohost-input-text" v-show="event === 'hosts'">
        <b-input-group>
          <template #prepend>
            <b-button :variant="isAutohostRandomized ? 'success':'danger'" @click="isAutohostRandomized = !isAutohostRandomized">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shuffle" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
              </svg>
            </b-button>
          </template>
          <b-button :variant="autohost ? 'success' : 'danger'"
                    @click="autohost = !autohost"
                    :disabled="isAutohostRandomized"
                    class="form-control">
            {{ translate(autohost ? 'timers.buttons.yes' : 'timers.buttons.no')}}
          </b-button>
        </b-input-group>
      </b-form-group>

      <b-form-group id="event-amount-input" :label="amountLabel" label-for="event-amount-input-text" v-show="haveAmount">
        <b-input-group>
          <template #prepend>
            <b-button :variant="isAmountRandomized ? 'success':'danger'" @click="isAmountRandomized = !isAmountRandomized">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shuffle" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
              </svg>
            </b-button>
          </template>
          <b-form-input
            id="event-amount-input-text"
            v-model.number="amount"
            placeholder="Enter amount"
            :disabled="isAmountRandomized"
          ></b-form-input>
        </b-input-group>
      </b-form-group>

      <b-form-group id="event-message-input" label="Message:" label-for="event-message-input-text" v-if="haveMessage">
        <b-input-group>
          <template #prepend>
            <b-button :variant="isMessageRandomized ? 'success':'danger'" @click="isMessageRandomized = !isMessageRandomized">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shuffle" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
              </svg>
            </b-button>
          </template>
          <b-form-textarea
            id="event-message-input-text"
            v-model="message"
            placeholder="Enter message"
            :disabled="isMessageRandomized"
            rows="3"
            max-rows="6"
          ></b-form-textarea>
        </b-input-group>
      </b-form-group>

      <b-form-group id="event-tier-input" label="Tier:" label-for="event-tier-input-text" v-show="haveTier">
        <b-input-group>
          <template #prepend>
            <b-button :variant="isTierRandomized ? 'success':'danger'" @click="isTierRandomized = !isTierRandomized">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shuffle" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
              </svg>
            </b-button>
          </template>
          <b-form-select
            id="event-tier-input-select"
            v-model="tier"
            :disabled="isTierRandomized"
          >
            <b-form-select-option v-for="t of tiers" :value="t" :key="t">{{t}}</b-form-select-option>
          </b-form-select>
        </b-input-group>
      </b-form-group>

      <b-form-group
        v-show="event === 'rewardredeems'"
        :label="translate('events.definitions.titleOfReward.label')"
        :label-for="'selectReward'"
      >
        <rewards :value.sync="reward" :state="null" />
    </b-form-group>



      <div class="d-flex align-items-center px-3 pt-3 border-top" style="justify-content: flex-end">
        <b-button class="mx-2" @click="$bvModal.hide('alert-test-modal')" variant="link">{{ translate('dialog.buttons.close') }}</b-button>
        <b-button @click="onSubmit" variant="primary">Test</b-button>
      </div>
    </b-form>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api'

import { getSocket } from 'src/panel/helpers/socket';
import translate from 'src/panel/helpers/translate';

const socket = getSocket('/registries/alerts');

export default defineComponent({
  components: {
    'rewards': () => import('src/panel/components/rewardDropdown.vue'),
  },
  setup(props, ctx) {
    const event = ref('follows' as typeof events[number])
    const username = ref('');
    const isUsernameRandomized = ref(true);

    const message = ref('');
    const isMessageRandomized = ref(true);
    const haveMessage = computed(() => {
      return ['cheers', 'resubs', 'rewardredeems'].includes(event.value)
    });

    const autohost = ref(true);
    const isAutohostRandomized = ref(true);

    const amount = ref(5);
    const isAmountRandomized = ref(true);
    const haveAmount = computed(() => {
      return amountLabel.value !== null;
    });
    const amountLabel = computed(() => {
      switch(event.value) {
        case 'hosts':
        case 'raids':
          return 'Amount of viewers:';
        case 'cheers':
        case 'cmdredeems':
          return 'Amount of bits:';
        case 'tips':
          return `Tip value (${ctx.root.$store.state.configuration.currency}):`;
        case 'subcommunitygifts':
          return `Gifts amount:`;
        case 'resubs':
        case 'subgifts':
          return `Months:`;
        default:
          return null;
      }
    })

    const tier = ref('Prime' as typeof tiers[number]);
    const isTierRandomized = ref(true);
    const haveTier = computed(() => {
      return ['subs', 'resubs'].includes(event.value)
    });

    const reward = ref('');

    const tiers = ['Prime', '1', '2', '3'] as const;
    const events = ['follows', 'cheers', 'tips', 'subs', 'resubs', 'subcommunitygifts', 'subgifts', 'hosts', 'raids', 'cmdredeems', 'rewardredeems'] as const;

    const onSubmit = () => {
      socket.emit('test', event.value)
    }
    return {
      event,
      events,

      username,
      isUsernameRandomized,

      autohost,
      isAutohostRandomized,

      amount,
      isAmountRandomized,
      haveAmount,
      amountLabel,

      tier,
      tiers,
      haveTier,
      isTierRandomized,

      message,
      isMessageRandomized,
      haveMessage,

      reward,

      onSubmit,

      translate,
    }
  }
})
</script>