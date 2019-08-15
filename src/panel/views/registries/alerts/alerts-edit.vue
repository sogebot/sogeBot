<template>
  <b-container fluid ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.registry') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.alerts') }}
          <template v-if="state.loaded === $state.DONE && $route.params.id">
            <small><i class="fas fa-angle-right"></i></small>
            {{name}}
            <small>{{$route.params.id}}</small>
          </template>
        </span>
      </b-col>
    </b-row>

    <panel>
      <template v-slot:left>
        <button-with-icon class="btn-secondary btn-reverse" icon="caret-left" href="#/registry/alerts/list">{{translate('commons.back')}}</button-with-icon>
        <hold-button v-if="$route.params.id" icon="trash" class="btn-danger" @trigger="remove()">
          <template slot="title">{{translate('dialog.buttons.delete')}}</template>
          <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
        </hold-button>
      </template>
      <template v-slot:right>
        <b-alert show variant="info" v-if="pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
        <state-button @click="save()" text="saveChanges" :state="state.save" :invalid="(!!$v.$invalid && !!$v.$dirty) || !isAllValid"/>
      </template>
    </panel>

    <loading v-if="!state.loaded === $state.DONE" />
    <b-form v-else>
      <b-form-group
        :label="translate('registry.alerts.name.name')"
        label-for="name"
        :description="translate('registry.alerts.name.help')"
      >
        <b-form-input
          id="name"
          v-model="item.name"
          type="text"
          :placeholder="translate('registry.alerts.name.placeholder')"
          @input="$v.item.name.$touch()"
          :state="$v.item.name.$invalid && $v.item.name.$dirty ? 'invalid' : null"
        ></b-form-input>
        <b-form-invalid-feedback>{{ translate('dialog.errors.required') }}</b-form-invalid-feedback>
      </b-form-group>

      <b-form-group
        :label="translate('registry.alerts.alertDelayInMs.name')"
        label-for="alertDelayInMs"
        :description="translate('registry.alerts.alertDelayInMs.help')"
      >
        <b-input-group class="mb-2 mr-sm-2 mb-sm-0">
          <b-form-input
            id="alertDelayInMs"
            v-model="item.alertDelayInMs"
            type="range"
            min="0"
            max="30000"
            step="500"
            :placeholder="translate('registry.alerts.alertDelayInMs.placeholder')"
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
        <small class="form-text text-muted" v-html="translate('registry.alerts.profanityFilterType.help')"></small>
        <b-form-checkbox class="mt-2 ml-2 normalLabel"
          v-model="item.loadStandardProfanityList"
        >
          {{ translate('registry.alerts.loadStandardProfanityList') }}
        </b-form-checkbox>
      </b-form-group>

      <b-form-group
        :label="translate('registry.alerts.customProfanityList.name')"
        label-for="customProfanityList"
        :description="translate('registry.alerts.customProfanityList.help')"
      >
        <b-textarea v-model.trim="customProfanityList" placeholder="kitty zebra horse"></b-textarea>
      </b-form-group>

      <b-tabs align="center" v-model="selectedTabIndex" >
        <b-tab v-for="event in supportedEvents" :key="'event-tab-' + event" :title="translate('registry.alerts.event.' + event)">
          <b-card no-body>
            <b-tabs card vertical pills>
              <b-tab :active="idx === 0" v-for="(alert, idx) of item.alerts[event]" :key="event + idx">
                <template slot="title">
                  <fa icon="exclamation-circle" v-if="!isValid[event][idx]" class="text-danger"/>
                  <fa :icon="['fas', 'circle']" v-else-if="alert.enabled"/>
                  <fa :icon="['far', 'circle']" v-else/>
                  Alert {{ idx + 1 }}
                </template>
                <p class="p-3">
                  <form-follow v-if="event === 'follows'" :alert.sync="alert" :isValid.sync="isValid[event][idx]" />
                </p>
              </b-tab>

              <!-- New Tab Button (Using tabs slot) -->
              <template slot="tabs">
                <b-nav-item @click.prevent="newAlert" href="#">
                  <fa icon="plus"/> <b>new alert</b></b-nav-item>
              </template>

              <!-- Render this if no tabs -->
              <div slot="empty" class="text-center text-muted">
                There are no alerts<br>
                Create new alert using the <b>+</b> button on left side.
              </div>
            </b-tabs>
          </b-card>
        </b-tab>
      </b-tabs>
    </b-form>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';

import { Validations } from 'vuelidate-property-decorators';
import { required } from 'vuelidate/lib/validators'

import uuid from 'uuid/v4';
import axios from 'axios';

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'form-follow': () => import('./components/form-follow.vue'),
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
  socket = io('/registry/alerts', { query: "token=" + this.token });

  error: any = null;

  state: { loaded: number; save: number } = { loaded: this.$state.progress, save: this.$state.idle }
  pending: boolean = false;

  supportedEvents: string[] = ['follows', 'cheers', 'subscribes', 'hosts', 'resubscribes']
  selectedTabIndex: number = 0;
  fonts: string[] = [];

  item: Registry.Alerts.Alert = {
    id: uuid(),
    name: '',
    alertDelayInMs: 5000,
    profanityFilterType: 'replace-with-asterisk',
    loadStandardProfanityList: true,
    customProfanityList: [],
    alerts: {
      follows: []
    },
  }

  isValid: {
    follows: boolean[];
  } = {
    follows: [],
  };

  get customProfanityList() {
    return this.item.customProfanityList.join(' ');
  }

  set customProfanityList(value) {
    this.item.customProfanityList = value.split(' ').filter(String);
  }

  get isAllValid() {
    for (const key of Object.keys(this.isValid)) {
      if (!this._.every(this.isValid[key])) {
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
      alerts: {
        follows: {
          messageTemplate: {required},
        }
      }
    },
  }

  async mounted() {
    this.state.loaded = this.$state.progress;
    this.state.loaded = this.$state.success;

    axios.get('/fonts')
      .then((r) => {
        this.fonts = r.data.items.map((o) => o.family)
      })
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
    switch(this.supportedEvents[this.selectedTabIndex]) {
      case 'follows':
        this.isValid.follows.push(true);
        this.item.alerts.follows.push({
          enabled: true,
          layout: '1',
          animationIn: 'fade-in',
          animationOut: 'fade-out',
          animationText: 'wiggle',
          messageTemplate: 'Thanks for follow {name}!',
          image: 'https://miro.medium.com/max/366/0*uJ7vuxfxDVOWzN8r.gif', // TBD to change
          sound: 'https://www.soundsnap.com/streamers/play.php?id=1565879472.5998:4c6153c1b2cbc60fb8a99130f0837139468ebeb0:a633887891242348b435273d685479d0c198cf98b32b47d00180fc1d87c2d09f52cf56b4d79b3fded10346b38de5b9973c8203eede5f86f1730b804f14a42c343c035562c22ec10d66182c2b985657373ff3e4f50538a3374cab96802f593aaaa2abf4ef450a77decd3261443d1767ffa349d676bd05833a82cfdc17bbeef628c02285d2c5e1e1118f3681076dfdced34fd0fe8186782e2a08d8220ef667c7bd029801d2fae778b1145ccd11ea7b8297dbdc832b4aa4372956b5ed90dfb8963629845e168da46e52bed68798d972462fc245bbdfb9a7c85a069230db72c76014286cf0e61fa17b1f4d7aa9482ab02a267357035c2eaac1b67750d19c17233e346ad3fe71d8ec2006edd9be338d7e0290d5c31b35fb646fd6076a64da8dd98053', // TBD to change
          soundVolume: 20,
          alertDurationInMs: 10000,
          alertTextDelayInMs: 0,
          enableAdvancedMode: false,
          font: {
            family: 'PT Sans',
            size: 24,
            weight: 800,
            color: '#ffffff',
            highlightcolor: '#00ff00',
          },
        })
        break;
    }
  }

  async remove () {
    /*
    await new Promise(resolve => {
      this.socket.emit('delete', this.$route.params.id, () => {
        resolve();
      })
    })
    this.$router.push({ name: 'CustomVariableList' });
    */
  }

  async save () {
    this.$v.$touch();
    if (!this.$v.$invalid) {
      this.state.save = this.$state.progress;

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