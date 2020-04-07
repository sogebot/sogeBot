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
        <b-dropdown id="dropdown-buttons" :text="translate('registry.alerts.test')" class="m-2">
          <b-dropdown-item-button
            @click="socket.emit('test', event)"
            v-for="event of ['follows', 'cheers', 'tips', 'subs', 'resubs', 'subgifts', 'hosts', 'raids']"
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

      <b-tabs align="center" v-model="selectedTabIndex" lazy>
        <b-tab v-for="event in supportedEvents" :key="'event-tab-' + event" :title="translate('registry.alerts.event.' + event)">
          <b-card no-body>
            <b-tabs card vertical pills content-class="col-9" nav-wrapper-class="col-3" nav-class="p-0" lazy>
              <b-tab :active="idx === 0" v-for="(alert, idx) of item[event]" :key="event + idx + selectedTabIndex">
                <template v-slot:title>
                  <fa icon="exclamation-circle" v-if="!isValid[event][idx]" class="text-danger"/>
                  <fa :icon="['far', 'check-circle']" v-else-if="alert.enabled"/>
                  <fa :icon="['far', 'circle']" v-else/>

                  <template v-if="alert.title.length > 0">{{alert.title}}</template>
                  <template v-else>Variant {{ idx + 1 }}</template>
                </template>
                <p class="p-3" v-bind:key="event + idx">
                  <form-follow v-if="event === 'follows' || event === 'subs' || event === 'subgifts'" :alert.sync="alert" :isValid.sync="isValid[event][idx]" @delete="deleteVariant(event, $event)"/>
                  <form-cheers v-else-if="event === 'cheers' || event === 'tips'" :alert.sync="alert" :isValid.sync="isValid[event][idx]" @delete="deleteVariant(event, $event)"/>
                  <form-resubs v-else-if="event === 'resubs'" :alert.sync="alert" :isValid.sync="isValid[event][idx]" @delete="deleteVariant(event, $event)"/>
                  <form-hosts v-else-if="event === 'hosts' || event === 'raids'" :alert.sync="alert" :isValid.sync="isValid[event][idx]" @delete="deleteVariant(event, $event)"/>
                </p>
              </b-tab>

              <!-- New Tab Button (Using tabs slot) -->
              <template v-slot:tabs-end>
                <b-nav-item @click.prevent="newAlert" href="#">
                  <fa icon="plus"/> <b>new alert</b></b-nav-item>
              </template>

              <!-- Render this if no tabs -->
              <template v-slot:empty>
                <div class="text-center text-muted">
                  There are no alerts<br>
                  Create new alert using the <b>+</b> button on left side.
                </div>
              </template>
            </b-tabs>
          </b-card>
        </b-tab>
      </b-tabs>
    </b-form>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import type { AlertInterface, CommonSettingsInterface } from 'src/bot/database/entity/alert';

import { remove, every } from 'lodash-es';

import defaultImage from '!!base64-loader!./media/cow01.gif';
import defaultAudio from '!!base64-loader!./media/456968__funwithsound__success-resolution-video-game-fanfare-sound-effect.mp3';

import { Validations } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators';

import { v4 as uuid } from 'uuid';

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
  },
  filters: {
    capitalize: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
})
export default class AlertsEdit extends Vue {
  socket = getSocket('/registries/alerts');

  error: any = null;

  state: { loaded: number; save: number } = { loaded: this.$state.progress, save: this.$state.idle }
  pending: boolean = false;

  supportedEvents: string[] = ['follows', 'cheers', 'subs', 'resubs', 'subgifts',  'tips', 'hosts', 'raids']
  selectedTabIndex: number = 0;

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
  }

  isValid: {
    follows: boolean[];
    cheers: boolean[];
    subs: boolean[];
    resubs: boolean[];
    subgifts: boolean[];
    tips: boolean[];
    hosts: boolean[];
    raids: boolean[];
  } = {
    follows: [],
    cheers: [],
    subs: [],
    resubs: [],
    subgifts: [],
    tips: [],
    hosts: [],
    raids: [],
  };

  get isAllValid() {
    for (const key of Object.keys(this.isValid)) {
      if (!every(this.isValid[key])) {
        return false;
      }
    }
    return true;
  }

  profanityFilterTypeOptions: { value: string; text: string }[] = [
    { value: 'disabled', text: this.translate('registry.alerts.profanityFilterType.disabled') },
    { value: 'replace-with-asterisk', text: this.translate('registry.alerts.profanityFilterType.replace-with-asterisk') },
    { value: 'replace-with-happy-words', text: this.translate('registry.alerts.profanityFilterType.replace-with-happy-words') },
    { value: 'hide-messages', text: this.translate('registry.alerts.profanityFilterType.hide-messages') },
    { value: 'disable-alerts', text: this.translate('registry.alerts.profanityFilterType.disable-alerts') },
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
      this.socket.emit('alerts::getOne', this.$route.params.id, (err, data: AlertInterface) => {
        if (err) {
          return console.error(err);
        }
        console.debug('Loaded', {data});
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

  beforeRouteUpdate(to, from, next) {
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

  beforeRouteLeave(to, from, next) {
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
  }

  newAlert() {
    const _default: CommonSettingsInterface = {
      messageTemplate: '',

      id: uuid(),
      title: '',
      variantCondition: 'random',
      variantAmount: 2,
      enabled: true,
      layout: '1',
      animationIn: 'fadeIn',
      animationOut: 'fadeOut',
      animationText: 'wiggle',
      animationTextOptions: {
        speed: 'slow',
        characters: '█▓░ </>',
        maxTimeToDecrypt: 4000,
      },
      imageId: uuid(),
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
        family: 'PT Sans',
        size: 24,
        borderPx: 1,
        borderColor: '#000000',
        weight: 800,
        color: '#ffffff',
        highlightcolor: '#00ff00',
      }
    }

    // save default media
    this.socket.emit('alerts::saveMedia', [
      { id: _default.imageId, b64data: 'data:image/gif;base64,' + defaultImage, chunkNo: 0 },
      { id: _default.soundId, b64data: 'data:audio/mp3;base64,' + defaultAudio, chunkNo: 0 },
    ], () => {
      this.isValid[this.supportedEvents[this.selectedTabIndex]].push(true);
      switch(this.supportedEvents[this.selectedTabIndex]) {
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
                family: 'PT Sans',
                size: 16,
                borderPx: 1,
                borderColor: '#000000',
                weight: 500,
                color: '#ffffff',
              },
            },
          })
          break;
        case 'subgifts':
          this.item.subgifts.push({
            ..._default,
            messageTemplate: '{name} just gifted {amount} subscribes!',
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
                family: 'PT Sans',
                size: 12,
                borderPx: 2,
                borderColor: '#000000',
                weight: 500,
                color: '#ffffff',
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
                family: 'PT Sans',
                size: 12,
                borderPx: 2,
                borderColor: '#000000',
                weight: 500,
                color: '#ffffff',
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

  deleteVariant(event, id) {
    console.debug('Removing', event, id);
    remove(this.item[event], (o: CommonSettingsInterface) => o.id === id);
    this.$forceUpdate();
  }

  async remove () {
    await new Promise(resolve => {
      this.socket.emit('alerts::delete', this.item, () => {
        resolve();
      })
    })
    this.$router.push({ name: 'alertsList' });
  }

  async save () {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;
      this.item.updatedAt = Date.now(); // save updateAt
      console.debug('Saving', this.item);
      this.socket.emit('alerts::save', this.item, (err, data) => {
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