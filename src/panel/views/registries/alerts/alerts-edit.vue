<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.alerts') }}
          <template v-if="state.loaded === $state.success && $route.params.id">
            <small><fa icon="angle-right"/></small>
            {{item.name}}
            <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/registry/alerts/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id && state.loaded === $state.success" icon="trash" class="btn-danger" @trigger="remove()">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </template>
      <template v-slot:right v-if="state.loaded === $state.success">
        <b-dropdown id="dropdown-buttons" :text="translate('registry.alerts.test')" class="m-2" :disabled="pending">
          <b-dropdown-item-button
            @click="socket.emit('test', event)"
            v-for="event of supportedEvents"
            v-bind:key="event">
            {{ translate('registry.alerts.event.' + event) }}</b-dropdown-item-button>
        </b-dropdown>

        <button-with-icon
          v-if="$route.params.id && state.loaded === $state.success"
          :text="'/overlays/alerts/' + item.id"
          :href="'/overlays/alerts/' + item.id"
          class="btn-dark mr-3"
          icon="link"
          target="_blank"
          />
        <b-alert show variant="info" v-if="pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="!!$v.$error || !isAllValid"/>
      </template>
    </panel>

    <loading v-if="state.loaded !== $state.success" />
    <b-form v-else>
      <b-form-group
        :label="translate('registry.alerts.name.name')"
        label-for="name"
      >
        <b-form-input
          id="name"
          v-model="item.name"
          type="text"
          :placeholder="translate('registry.alerts.name.placeholder')"
          @input="$v.item.name.$touch()"
          :state="$v.item.name.$invalid && $v.item.name.$dirty ? false : null"
        ></b-form-input>
        <b-form-invalid-feedback :state="!($v.item.name.$invalid && $v.item.name.$dirty)">{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>

      <b-form-group
        :label="translate('registry.alerts.alertDelayInMs.name')"
        label-for="alertDelayInMs"
      >
        <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
          <b-form-input
            id="alertDelayInMs"
            v-model.number="item.alertDelayInMs"
            type="range"
            min="0"
            max="30000"
            step="500"
            :placeholder="translate('AlertDelayInMs.placeholder')"
          ></b-form-input>
          <b-input-group-text slot="append" class="pr-3 pl-3">
            <div style="width: 3rem;">
              {{ String(item.alertDelayInMs / 1000) + 's' }}
            </div>
          </b-input-group-text>

        </b-input-group>
      </b-form-group>

      <b-form-group
        :label="translate('registry.alerts.profanityFilterType.name')"
        label-for="profanityFilterType"
      >
        <b-form-select v-model="item.profanityFilterType" :options="profanityFilterTypeOptions" plain />
      </b-form-group>

      <b-form-group
        :label="translate('registry.alerts.loadStandardProfanityList')"
        label-for="profanityFilterType"
      >
        <b-row>
          <b-col sm="auto" v-for="lang of Object.keys(item.loadStandardProfanityList)" v-bind:key="lang">
            <b-form-checkbox class="mt-2 ml-2 normalLabel" v-model="item.loadStandardProfanityList[lang]">
              {{ lang }}
            </b-form-checkbox>
          </b-col>
        </b-row>
      </b-form-group>
      <b-form-group
        :label="translate('registry.alerts.customProfanityList.name')"
        label-for="customProfanityList"
        :description="translate('registry.alerts.customProfanityList.help')"
      >
        <b-textarea v-model="item.customProfanityList" placeholder="kitty, zebra, horse"></b-textarea>
      </b-form-group>

      <b-row no-gutters>
        <b-col cols="auto">
          <b-card>
            <b-card-text style="max-width: 281px;">
              <b-form inline>
                <b-form-select v-model="selectedNewEvent">
                  <b-select-option :value="event" v-for="event of supportedEvents" v-bind:key="'add-alert-' + event">{{ translate('registry.alerts.event.' + event) }}</b-select-option>
                </b-form-select>
                <b-button class="text-left" variant="success" @click="newAlert(selectedNewEvent)">
                  <fa icon="plus"/>
                </b-button>
              </b-form>

              <div v-for="event in supportedEvents" :key="'event-tab-' + event">
                <title-divider>{{ translate('registry.alerts.event.' + event) }}</title-divider>
                <b-button class="w-100 text-left" @click="selectedAlertId = alert.id" :variant="selectedAlertId === alert.id ? 'primary' : 'link'" v-for="(alert, idx) of item[event]" :key="event + alert.id">
                  <span style="margin: 1rem;">
                    <fa icon="exclamation-circle" v-if="isValid[event][alert.id] === false" class="text-danger"/>
                    <fa :icon="['far', 'check-circle']" v-else-if="alert.enabled"/>
                    <fa :icon="['far', 'circle']" v-else/>

                    <template v-if="alert.title.length > 0">{{alert.title}}</template>
                    <template v-else>Variant {{ idx + 1 }}</template>
                  </span>
                </b-button>
              </div>
            </b-card-text>
          </b-card>
        </b-col>
        <b-col>
          <b-card>
            <form-follow :event="selectedAlertType" v-if="selectedAlertType === 'cmdredeems' || selectedAlertType === 'follows' || selectedAlertType === 'subs' || selectedAlertType === 'subgifts' || selectedAlertType === 'subcommunitygifts'" :validationDate.sync="validationDate" :alert.sync="selectedAlert" :isValid.sync="isValid[selectedAlertType][selectedAlertId]" @delete="deleteVariant(selectedAlertType, $event)"/>
            <form-cheers :event="selectedAlertType" v-else-if="selectedAlertType === 'cheers' || selectedAlertType === 'tips'" :validationDate.sync="validationDate" :alert.sync="selectedAlert" :isValid.sync="isValid[selectedAlertType][selectedAlertId]" @delete="deleteVariant(selectedAlertType, $event)"/>
            <form-resubs :event="selectedAlertType" v-else-if="selectedAlertType === 'resubs'" :validationDate.sync="validationDate" :alert.sync="selectedAlert" :isValid.sync="isValid[selectedAlertType][selectedAlertId]" @delete="deleteVariant(selectedAlertType, $event)"/>
            <form-hosts :event="selectedAlertType" v-else-if="selectedAlertType === 'hosts' || selectedAlertType === 'raids'" :validationDate.sync="validationDate" :type="selectedAlertType" :alert.sync="selectedAlert" :isValid.sync="isValid[selectedAlertType][selectedAlertId]" @delete="deleteVariant(selectedAlertType, $event)"/>
            <form-reward :event="selectedAlertType" v-else-if="selectedAlertType === 'rewardredeems'" :validationDate.sync="validationDate" :type="selectedAlertType" :alert.sync="selectedAlert" :isValid.sync="isValid[selectedAlertType][selectedAlertId]" @delete="deleteVariant(selectedAlertType, $event)"/>
          </b-card>
        </b-col>
      </b-row>
    </b-form>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import type { AlertInterface, CommonSettingsInterface } from 'src/bot/database/entity/alert';
import translate from 'src/panel/helpers/translate';

import { Route } from 'vue-router'
import { NextFunction } from 'express';

import { remove, every } from 'lodash-es';

import defaultImage from '!!base64-loader!./media/cow01.gif';
import defaultAudio from '!!base64-loader!./media/456968__funwithsound__success-resolution-video-game-fanfare-sound-effect.mp3';

import { Validations } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators';

import { v4 as uuid } from 'uuid';

const supportedEvents = ['follows', 'cheers', 'subs', 'resubs', 'subcommunitygifts', 'subgifts',  'tips', 'hosts', 'raids', 'cmdredeems', 'rewardredeems'] as const;

type isValid = {
  follows: { [x: string]: boolean };
  cheers: { [x: string]: boolean };
  subs: { [x: string]: boolean };
  resubs: { [x: string]: boolean };
  subgifts: { [x: string]: boolean };
  subcommunitygifts: { [x: string]: boolean };
  tips: { [x: string]: boolean };
  hosts: { [x: string]: boolean };
  raids: { [x: string]: boolean };
  cmdredeems: { [x: string]: boolean };
  rewardredeems: { [x: string]: boolean };
};

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'form-follow': () => import('./components/form-follow.vue'),
    'form-cheers': () => import('./components/form-cheers.vue'),
    'form-resubs': () => import('./components/form-resubs.vue'),
    'form-hosts': () => import('./components/form-hosts.vue'),
    'form-reward': () => import('./components/form-reward.vue'),
    'title-divider': () => import('src/panel/components/title-divider.vue'),
  },
  filters: {
    capitalize: function (value: string) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class AlertsEdit extends Vue {
  translate = translate;
  socket = getSocket('/registries/alerts');

  error: any = null;
  validationDate = Date.now();

  state: { loaded: number; save: number } = { loaded: this.$state.progress, save: this.$state.idle }
  pending: boolean = false;

  supportedEvents = supportedEvents;
  selectedNewEvent = 'follows'
  selectedAlertId: string = '';

  item: AlertInterface = {
    id: uuid(),
    updatedAt: Date.now(),
    name: '',
    alertDelayInMs: 0,
    profanityFilterType: 'replace-with-asterisk',
    loadStandardProfanityList: {
      cs: false,
      en: true,
      ru: false,
    },
    customProfanityList: '',

    follows: [],
    hosts: [],
    raids: [],
    cheers: [],
    subs: [],
    tips: [],
    resubs: [],
    subgifts: [],
    subcommunitygifts: [],
    cmdredeems: [],
    rewardredeems: [],
  }

  isValid: isValid = {
    follows: {},
    cheers: {},
    subs: {},
    resubs: {},
    subgifts: {},
    subcommunitygifts: {},
    tips: {},
    hosts: {},
    raids: {},
    cmdredeems: {},
    rewardredeems: {},
  };

  get isAllValid() {
    for (const key of Object.keys(this.isValid)) {
      if (!every(this.isValid[key as keyof AlertsEdit['isValid']])) {
        return false;
      }
    }
    return true;
  }

  get selectedAlert() {
    const events = [
      ...this.item.follows,
      ...this.item.hosts,
      ...this.item.raids,
      ...this.item.cheers,
      ...this.item.subs,
      ...this.item.tips,
      ...this.item.resubs,
      ...this.item.subgifts,
      ...this.item.subcommunitygifts,
      ...this.item.cmdredeems,
      ...this.item.rewardredeems,
    ];
    return events.find(o => o.id === this.selectedAlertId);
  }

  get selectedAlertType() {
    const events = ['follows', 'hosts', 'raids', 'cheers', 'subs', 'tips', 'resubs', 'subgifts', 'subcommunitygifts', 'cmdredeems', 'rewardredeems'] as const
    for (const event of events) {
      if (this.item[event].find(o => o.id === this.selectedAlertId)) {
        return event
      }
    }
    return null;
  }

  profanityFilterTypeOptions: { value: string; text: string }[] = [
    { value: 'disabled', text: translate('registry.alerts.profanityFilterType.disabled') },
    { value: 'replace-with-asterisk', text: translate('registry.alerts.profanityFilterType.replace-with-asterisk') },
    { value: 'replace-with-happy-words', text: translate('registry.alerts.profanityFilterType.replace-with-happy-words') },
    { value: 'hide-messages', text: translate('registry.alerts.profanityFilterType.hide-messages') },
    { value: 'disable-alerts', text: translate('registry.alerts.profanityFilterType.disable-alerts') },
  ]

  @Validations()
  validations = {
    item: {
      name: {required},
    }
  }

  async mounted() {
    this.state.loaded = this.$state.progress;
    if (this.$route.params.id) {
      this.socket.emit('generic::getOne', this.$route.params.id, (err: string | null, data: AlertInterface) => {
        if (err) {
          return console.error(err);
        }
        console.debug('Loaded', {data});
        // workaround for missing weight after https://github.com/sogehige/sogeBot/issues/3871
        // workaround for missing shadow settings after https://github.com/sogehige/sogeBot/issues/3875
        for (const alert of data.follows) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        for (const alert of data.subs) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        for (const alert of data.subcommunitygifts) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        for (const alert of data.hosts) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        for (const alert of data.raids) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        for (const alert of data.tips) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        for (const alert of data.cheers) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        for (const alert of data.resubs) {
          alert.font.weight = alert.font.weight ?? 500;
          alert.font.shadow = alert.font.shadow ?? [];
        }
        this.item = data;
        this.state.loaded = this.$state.success;
        this.$nextTick(() => {
          this.pending = false;
        });
      })
    } else {
      this.state.loaded = this.$state.success;
    }
  }

  beforeRouteUpdate(to: Route, from: Route, next: NextFunction) {
    if (this.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }

  beforeRouteLeave(to: Route, from: Route, next: NextFunction) {
    if (this.pending) {
      const isOK = confirm('You will lose your pending changes. Do you want to continue?')
      if (!isOK) {
        next(false);
      } else {
        next();
      }
    } else {
      next();
    }
  }

  @Watch('item', { deep: true })
  setPendingState() {
    if (this.state.loaded === this.$state.success) {
      this.pending = true;
    }
    const events = [
      ...this.item.follows,
      ...this.item.hosts,
      ...this.item.raids,
      ...this.item.cheers,
      ...this.item.subs,
      ...this.item.tips,
      ...this.item.resubs,
      ...this.item.subgifts,
      ...this.item.subcommunitygifts,
      ...this.item.cmdredeems,
      ...this.item.rewardredeems,
    ]
    if (this.selectedAlertId === '' && events.length > 0) {
      this.selectedAlertId = events[0].id as string;
    }
  }

  newAlert(event: keyof isValid) {
    const _default: CommonSettingsInterface = {
      messageTemplate: '',

      id: uuid(),
      title: '',
      variantCondition: 'random',
      variantAmount: 2,
      enabled: true,
      layout: '1',
      animationInDuration: 1000,
      animationOutDuration: 1000,
      animationIn: 'fadeIn',
      animationOut: 'fadeOut',
      animationText: 'wiggle',
      animationTextOptions: {
        speed: 'slow',
        characters: '█▓░ </>',
        maxTimeToDecrypt: 4000,
      },
      imageId: uuid(),
      imageOptions: {
        translateX: 0,
        translateY: 0,
        scale: 100,
      },
      soundId: uuid(),
      soundVolume: 20,
      alertDurationInMs: 10000,
      alertTextDelayInMs: 1500,
      enableAdvancedMode: false,
      advancedMode: {
        html: null,
        css: '',
        js: null,
      },
      tts: {
        enabled: false,
        skipUrls: true,
        keepAlertShown: false,
        voice: 'UK English Female',
        volume: 1,
        rate: 1,
        pitch: 1,
        minAmountToPlay: 0,
      },
      font: {
        align: 'center',
        family: 'PT Sans',
        size: 24,
        borderPx: 1,
        borderColor: '#000000',
        weight: 800,
        color: '#ffffff',
        highlightcolor: '#00ff00',
        shadow: []
      }
    }

    // save default media
    this.socket.emit('alerts::saveMedia', [
      { id: _default.imageId, b64data: 'data:image/gif;base64,' + defaultImage, chunkNo: 0 },
      { id: _default.soundId, b64data: 'data:audio/mp3;base64,' + defaultAudio, chunkNo: 0 },
    ], () => {
      this.isValid[event][_default.id as string] = true;
      switch(event) {
        case 'follows':
          this.item.follows.push({
            ..._default,
            messageTemplate: '{name} is now following!',
          })
          break;
        case 'cheers':
          this.item.cheers.push({
            ..._default,
            messageTemplate: '{name} cheered! x{amount}',
            message: {
              minAmountToShow: 0,
              allowEmotes: {
                twitch: true, ffz: true, bttv: true
              },
              font: {
                align: 'left',
                family: 'PT Sans',
                size: 16,
                borderPx: 1,
                borderColor: '#000000',
                weight: 500,
                color: '#ffffff',
                shadow: [],
              },
            },
          })
          break;
        case 'subcommunitygifts':
          this.item.subcommunitygifts.push({
            ..._default,
            messageTemplate: '{name} just gifted {amount} subscribes!',
          })
          break;
        case 'subgifts':
          this.item.subgifts.push({
            ..._default,
            messageTemplate: '{name} just gifted sub to {recipient}! {amount} {monthsName}',
          })
          break;
        case 'rewardredeems':
          this.item.rewardredeems.push({
            ..._default,
            message: {
              minAmountToShow: 0,
              allowEmotes: {
                twitch: true, ffz: true, bttv: true
              },
              font: {
                align: 'left',
                family: 'PT Sans',
                size: 16,
                borderPx: 1,
                borderColor: '#000000',
                weight: 500,
                color: '#ffffff',
                shadow: [],
              },
            },
            messageTemplate: '{name} was redeemed by {recipient}!',
            rewardId: '',
          })
          break;
        case 'cmdredeems':
          this.item.cmdredeems.push({
            ..._default,
            messageTemplate: '{name} was redeemed by {recipient} for x${amount}!',
          })
          break;
        case 'subs':
          this.item.subs.push({
            ..._default,
            messageTemplate: '{name} just subscribed!',
          })
          break;
        case 'resubs':
          this.item.resubs.push({
            ..._default,
            messageTemplate: '{name} just resubscribed! {amount} {monthsName}',
            message: {
              allowEmotes: {
                twitch: true, ffz: true, bttv: true
              },
              font: {
                align: 'left',
                family: 'PT Sans',
                size: 12,
                borderPx: 2,
                borderColor: '#000000',
                weight: 500,
                color: '#ffffff',
                shadow: [],
              },
            },
          })
          break;
        case 'tips':
          this.item.tips.push({
            ..._default,
            messageTemplate: '{name} donated {amount}{currency}!',
            message: {
              minAmountToShow: 0,
              allowEmotes: {
                twitch: true, ffz: true, bttv: true
              },
              font: {
                align: 'left',
                family: 'PT Sans',
                size: 12,
                borderPx: 2,
                borderColor: '#000000',
                weight: 500,
                color: '#ffffff',
                shadow: [],
              },
            },
          })
          break;
        case 'hosts':
          this.item.hosts.push({
            ..._default,
            showAutoHost: false,
            messageTemplate: '{name} is now hosting my stream with {amount} viewers!',
          })
          break;
        case 'raids':
          this.item.raids.push({
            ..._default,
            showAutoHost: false,
            messageTemplate: '{name} is raiding with a party of {amount} raiders!',
          })
          break;
      }
    });
  }

  deleteVariant(event: typeof supportedEvents[number], id: string) {
    console.debug('Removing', event, id);
    remove(this.item[event], (o: CommonSettingsInterface) => o.id === id);
    this.$forceUpdate();
  }

  async remove () {
    await new Promise<void>(resolve => {
      this.socket.emit('alerts::delete', this.item, () => {
        resolve();
      })
    })
    this.$router.push({ name: 'alertsList' });
  }

  async save () {
    this.validationDate = Date.now();
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;
      this.item.updatedAt = Date.now(); // save updateAt
      console.debug('Saving', this.item);
      this.socket.emit('alerts::save', this.item, (err: string | null, data: AlertInterface) => {
        if (err) {
          this.state.save = this.$state.fail;
          return console.error(err);
        }

        this.state.save = this.$state.success;
        this.pending = false;
        this.$router.push({ name: 'alertsEdit', params: { id: String(data.id) } }).catch(err => {})

        setTimeout(() => {
          this.state.save = this.$state.idle;
        }, 1000)

        console.debug('Clearing unused media')
        this.socket.emit('clear-media')
      });
    } else {
      setTimeout(() => {
        this.state.save = this.$state.idle;
      }, 1000)
    }
  }
}
</script>

<style>
  .alertRegistryEventHeaderTab {
    font-weight: bold;
    font-size: 1.1rem;
  }
  .normalLabel .custom-control-label {
    font-size: 1rem !important;
    font-variant: inherit !important;
    font-weight: inherit !important;
    text-indent: inherit !important;
    letter-spacing: inherit !important;
  }
</style>

<style scoped>
  .nav-pills {
    padding: 0;
  }
  .nav-pills li a {
    min-width: 300px;
  }
</style>