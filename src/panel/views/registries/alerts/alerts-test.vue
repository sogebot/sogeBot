<template>
  <div>
    <b-form>
      <b-form-group
        id="event-type-input"
        :label="translate('registry.alerts.testDlg.event')"
        label-for="event-type-input-select"
      >
        <b-form-select
          id="event-type-input-select"
          v-model="event"
        >
          <b-form-select-option
            v-for="ev of events"
            :key="ev"
            :value="ev"
          >
            {{ translate('registry.alerts.event.' + ev) }}
          </b-form-select-option>
        </b-form-select>
      </b-form-group>

      <b-form-group
        v-if="event !== 'rewardredeems'"
        id="event-username-input"
        :label="event === 'cmdredeems' ? translate('registry.alerts.testDlg.command') : translate('registry.alerts.testDlg.username')"
        label-for="event-username-input-text"
      >
        <b-input-group>
          <template #prepend>
            <b-button
              :variant="isUsernameRandomized ? 'success':'danger'"
              @click="isUsernameRandomized = !isUsernameRandomized"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-shuffle"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"
                />
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z" />
              </svg>
            </b-button>
          </template>
          <b-form-input
            id="event-username-input-text"
            v-model="username"
            :disabled="isUsernameRandomized"
          />
        </b-input-group>
      </b-form-group>

      <b-form-group
        v-if="event === 'rewardredeems'"
        :label="translate('events.definitions.titleOfReward.label')"
        :label-for="'selectReward'"
      >
        <rewards
          :value.sync="reward"
          :state="null"
        />
      </b-form-group>

      <b-form-group
        v-if="haveRecipient"
        id="event-recipient-input"
        :label="translate('registry.alerts.testDlg.recipient')"
        label-for="event-recipient-input-text"
      >
        <b-input-group>
          <template #prepend>
            <b-button
              :variant="isRecipientRandomized ? 'success':'danger'"
              @click="isRecipientRandomized = !isRecipientRandomized"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-shuffle"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"
                />
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z" />
              </svg>
            </b-button>
          </template>
          <b-form-input
            id="event-recipient-input-text"
            v-model="recipient"
            :disabled="isRecipientRandomized"
          />
        </b-input-group>
      </b-form-group>

      <b-form-group
        v-if="haveAmount"
        id="event-amount-input"
        :label="amountLabel"
        label-for="event-amount-input-text"
      >
        <b-input-group>
          <template #prepend>
            <b-button
              :variant="isAmountRandomized ? 'success':'danger'"
              @click="isAmountRandomized = !isAmountRandomized"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-shuffle"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"
                />
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z" />
              </svg>
            </b-button>
          </template>
          <template
            v-if="event === 'tips'"
            #append
          >
            <select
              v-model="currency"
              class="form-control"
            >
              <option value="USD">
                USD
              </option>
              <option value="AUD">
                AUD
              </option>
              <option value="BGN">
                BGN
              </option>
              <option value="BRL">
                BRL
              </option>
              <option value="CAD">
                CAD
              </option>
              <option value="CHF">
                CHF
              </option>
              <option value="CNY">
                CNY
              </option>
              <option value="CZK">
                CZK
              </option>
              <option value="DKK">
                DKK
              </option>
              <option value="EUR">
                EUR
              </option>
              <option value="GBP">
                GBP
              </option>
              <option value="HKD">
                HKD
              </option>
              <option value="HRK">
                HRK
              </option>
              <option value="HUF">
                HUF
              </option>
              <option value="IDR">
                IDR
              </option>
              <option value="ILS">
                ILS
              </option>
              <option value="INR">
                INR
              </option>
              <option value="ISK">
                ISK
              </option>
              <option value="JPY">
                JPY
              </option>
              <option value="KRW">
                KRW
              </option>
              <option value="MXN">
                MXN
              </option>
              <option value="MYR">
                MYR
              </option>
              <option value="NOK">
                NOK
              </option>
              <option value="NZD">
                NZD
              </option>
              <option value="PHP">
                PHP
              </option>
              <option value="PLN">
                PLN
              </option>
              <option value="RON">
                RON
              </option>
              <option value="RUB">
                RUB
              </option>
              <option value="SEK">
                SEK
              </option>
              <option value="SGD">
                SGD
              </option>
              <option value="THB">
                THB
              </option>
              <option value="TRY">
                TRY
              </option>
              <option value="ZAR">
                ZAR
              </option>
            </select>
          </template>
          <b-form-input
            id="event-amount-input-text"
            v-model.number="amount"
            :disabled="isAmountRandomized"
          />
        </b-input-group>
      </b-form-group>

      <b-form-group
        v-if="haveMessage"
        id="event-message-input"
        :label="translate('registry.alerts.testDlg.message')"
        label-for="event-message-input-text"
      >
        <b-input-group>
          <template #prepend>
            <b-button
              :variant="isMessageRandomized ? 'success':'danger'"
              @click="isMessageRandomized = !isMessageRandomized"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-shuffle"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"
                />
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z" />
              </svg>
            </b-button>
          </template>
          <b-form-textarea
            id="event-message-input-text"
            v-model="message"
            :disabled="isMessageRandomized"
            rows="3"
            max-rows="6"
          />
        </b-input-group>
      </b-form-group>

      <b-form-group
        v-if="haveTier"
        id="event-tier-input"
        :label="translate('registry.alerts.testDlg.tier')"
        label-for="event-tier-input-text"
      >
        <b-input-group>
          <template #prepend>
            <b-button
              :variant="isTierRandomized ? 'success':'danger'"
              @click="isTierRandomized = !isTierRandomized"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-shuffle"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"
                />
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z" />
              </svg>
            </b-button>
          </template>
          <b-form-select
            id="event-tier-input-select"
            v-model="tier"
            :disabled="isTierRandomized"
          >
            <b-form-select-option
              v-for="t of tiers"
              :key="t"
              :value="t"
            >
              {{ t }}
            </b-form-select-option>
          </b-form-select>
        </b-input-group>
      </b-form-group>

      <div
        class="d-flex align-items-center px-3 pt-3 border-top"
        style="justify-content: flex-end"
      >
        <b-button
          class="mx-2"
          variant="link"
          @click="$bvModal.hide('alert-test-modal')"
        >
          {{ translate('dialog.buttons.close') }}
        </b-button>
        <b-button
          variant="primary"
          @click="onSubmit"
        >
          Test
        </b-button>
      </div>
    </b-form>
  </div>
</template>
<script lang="ts">
import { getSocket } from '@sogebot/ui-helpers/socket';
import translate from '@sogebot/ui-helpers/translate';
import {
  computed, defineComponent, ref,
} from '@vue/composition-api';

import { EmitData } from 'src/bot/database/entity/alert';
import { shuffle } from 'src/bot/helpers/array/shuffle';
import { generateUsername } from 'src/bot/helpers/generateUsername';

const socket = getSocket('/registries/alerts');

export default defineComponent({
  components: { 'rewards': () => import('src/panel/components/rewardDropdown.vue') },
  setup(props, ctx) {
    const event = ref('follows' as typeof events[number]);
    const username = ref('');
    const reward = ref(null as null | string);
    const isUsernameRandomized = ref(true);

    const recipient = ref('');
    const isRecipientRandomized = ref(true);
    const haveRecipient = computed(() => {
      return ['rewardredeems', 'subgift'].includes(event.value);
    });

    const message = ref('');
    const isMessageRandomized = ref(true);
    const haveMessage = computed(() => {
      return ['cheers', 'resubs', 'rewardredeems'].includes(event.value);
    });

    const amount = ref(5);
    const isAmountRandomized = ref(true);
    const haveAmount = computed(() => {
      return amountLabel.value !== null;
    });
    const currency = ref(ctx.root.$store.state.configuration.currency);
    const amountLabel = computed(() => {
      switch(event.value) {
        case 'hosts':
        case 'raids':
          return translate('registry.alerts.testDlg.amountOfViewers');
        case 'cheers':
        case 'cmdredeems':
          return translate('registry.alerts.testDlg.amountOfBits');
        case 'tips':
          return translate('registry.alerts.testDlg.amountOfTips');
        case 'subcommunitygifts':
          return translate('registry.alerts.testDlg.amountOfGifts');
        case 'resubs':
        case 'subgifts':
          return translate('registry.alerts.testDlg.amountOfMonths');
        default:
          return null;
      }
    });

    const tier = ref('Prime' as typeof tiers[number]);
    const isTierRandomized = ref(true);
    const haveTier = computed(() => {
      return ['subs', 'resubs'].includes(event.value);
    });

    const tiers = ['Prime', '1', '2', '3'] as const;
    const events = ['follows', 'cheers', 'tips', 'subs', 'resubs', 'subcommunitygifts', 'subgifts', 'hosts', 'raids', 'cmdredeems', 'rewardredeems'] as const;

    const onSubmit = () => {
      const messages = [
        'Lorem ipsum dolor sit amet, https://www.google.com',
        'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Etiam dictum tincidunt diam. Aliquam erat volutpat. Mauris tincidunt sem sed arcu. Etiam sapien elit, consequat eget, tristique non, venenatis quis, ante. Praesent id justo in neque elementum ultrices. Integer pellentesque quam vel velit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Etiam commodo dui eget wisi. Cras pede libero, dapibus nec, pretium sit amet, tempor quis. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.',
        'Lorem ipsum dolor sit amet, consectetuer adipiscing elit.',
        'This is some testing message :)',
        'Lorem ipsum dolor sit amet',
        '',
      ];

      const emit: EmitData = {
        amount: isAmountRandomized.value ? Math.floor(Math.random() * 1000) : amount.value,
        name:
          event.value === 'rewardredeems' ? reward.value || ''
            : (isUsernameRandomized.value ? generateUsername() : username.value),
        tier:       isTierRandomized.value ? tiers[shuffle([0,1,2,3])[0]] : tier.value,
        recipient:  isRecipientRandomized.value ? generateUsername() : recipient.value,
        currency:   currency.value,
        message:    isMessageRandomized.value ? shuffle(messages)[0] : message.value,
        event:      event.value,
        monthsName: '', // will be added at server
      };
      socket.emit('test', emit);
    };
    return {
      event,
      events,

      reward,
      username,
      isUsernameRandomized,

      recipient,
      isRecipientRandomized,
      haveRecipient,

      amount,
      isAmountRandomized,
      haveAmount,
      amountLabel,
      currency,

      tier,
      tiers,
      haveTier,
      isTierRandomized,

      message,
      isMessageRandomized,
      haveMessage,

      onSubmit,

      translate,
    };
  },
});
</script>