<template>
  <b-container fluid>
    <template v-if="state.loading === 1">
      <b-row>
        <b-col>
          <span class="title text-default mb-2">
            {{ translate('menu.manage') }}
            <small><fa icon="angle-right"/></small>
            {{ translate('menu.viewers') }}
          </span>
        </b-col>
      </b-row>

      <panel>
        <template v-slot:left>
          <button-with-icon class="btn-secondary btn-shrink btn-reverse" icon="caret-left" href="#/manage/viewers/list">{{translate('commons.back')}}</button-with-icon>
        </template>
      </panel>
      <loading slow/>
    </template>
    <template v-else>
      <b-row>
        <b-col>
          <span class="title text-default mb-2">
            {{ translate('menu.manage') }}
            <small><fa icon="angle-right"/></small>
            {{ translate('menu.viewers') }}
            <template v-if="$route.params.id">
              <small><fa icon="angle-right"/></small>
              {{viewer.username}}
              <small class="text-muted text-monospace" style="font-size:0.7rem">{{$route.params.id}}</small>
            </template>
          </span>
        </b-col>
      </b-row>

      <panel>
        <template v-slot:left>
          <button-with-icon class="btn-secondary btn-shrink btn-reverse" icon="caret-left" href="#/manage/viewers/list">{{translate('commons.back')}}</button-with-icon>
          <hold-button v-if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-shrink btn-danger">
            <template slot="title">{{translate('dialog.buttons.delete')}}</template>
            <template slot="onHoldTitle">{{translate('dialog.buttons.hold-to-delete')}}</template>
          </hold-button>
          <button type="button" class="btn btn-outline-primary border-light" @click="forceCheckFollowedAt()">
            <fa fixed-width icon="sync-alt" class="mr-1" :spin="state.forceCheckFollowedAt"></fa>
            Force 'followed since' check
          </button>
        </template>
        <template v-slot:right>
          <b-alert show variant="info" v-if="state.pending" v-html="translate('dialog.changesPending')" class="mr-2 p-2 mb-0"></b-alert>
          <state-button @click="save()" text="saveChanges" class="btn-shrink" :state="state.save" />
        </template>
      </panel>

      <div class="pt-3">
        <!-- Editation stuff here -->
        <form>
          <div class="form-row pl-2 pr-2">
            <div class="form-group col">
              <label>{{ translate('last-seen') }}</label>
              <input readonly="true" v-model="lastSeen" type="text" class="form-control">
            </div>
            <div class="form-group col">
              <label>{{ translate('followed-since') }}</label>
              <div class="input-group">
                <datetime
                  v-model="viewer.followedAt"
                  :config="dateTimePickerConfig"
                  :disabled="viewer.haveFollowedAtLock"
                  class="form-control"/>
                <div class="input-group-append">
                  <button type="button" class="border border-left-0 btn" :class="[viewer.haveFollowedAtLock ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.haveFollowedAtLock = !viewer.haveFollowedAtLock">
                    <fa :icon="viewer.haveFollowedAtLock ? 'lock' : 'unlock'"></fa>
                  </button>
                </div>
              </div>
            </div>
            <div class="form-group col">
              <label>{{ translate('subscribed-since') }}</label>
              <div class="input-group">
                <datetime
                  v-model="viewer.subscribedAt"
                  :config="dateTimePickerConfig"
                  :disabled="viewer.haveSubscribedAtLock"
                  class="form-control"/>
                <div class="input-group-append">
                  <button type="button" class="btn border" :class="[viewer.haveSubscribedAtLock ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.haveSubscribedAtLock = !viewer.haveSubscribedAtLock">
                    <fa :icon="viewer.haveSubscribedAtLock ? 'lock' : 'unlock'"></fa>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-row pl-2 pr-2">
            <div class="form-group col">
              <label>{{ translate('message') }}</label>
              <input v-model.number="viewer.messages" type="text" class="form-control">
            </div>
            <div class="form-group col">
              <label>{{ translate('points') }}</label>
              <input v-model.number="viewer.points" type="text" class="form-control">
            </div>
            <div class="form-group col">
              <label>{{ translate('watched-time') }} <small>{{ translate('hours') }}</small></label>
              <input v-model.number="watchedTime" type="text" class="form-control">
            </div>
            <div class="form-group col">
              <label>{{ translate('subgifts') }}</label>
              <input v-model.number="viewer.giftedSubscribes" type="text" class="form-control" readonly="true">
            </div>
            <div class="form-group col">
              <label>{{ translate('subCumulativeMonths') }}</label>
              <input v-model.number="viewer.subscribeCumulativeMonths" type="text" class="form-control" readonly="true">
            </div>
            <div class="form-group col">
              <label>{{ translate('subStreak') }}</label>
              <input v-model.number="viewer.subscribeStreak" type="text" class="form-control" readonly="true">
            </div>
          </div>

          <div class="form-row pl-2 pr-2 pb-3">
            <div class="col">
              <div class="btn-group d-flex" role="group">
                <button :disabled="viewer.haveFollowerLock" type="button" class="btn btn-block" v-on:click="viewer.isFollower = !viewer.isFollower" v-bind:class="[ viewer.isFollower ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">Follower</button>
                <button type="button" class="border border-left-0 btn" :class="[viewer.haveFollowerLock ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.haveFollowerLock = !viewer.haveFollowerLock">
                  <fa :icon="viewer.haveFollowerLock ? 'lock' : 'unlock'"></fa>
                </button>
              </div>
            </div>
            <div class="col">
                <div class="btn-group d-flex" role="group">
                  <button :disabled="viewer.haveSubscriberLock" type="button" class="btn btn-block" v-on:click="viewer.isSubscriber = !viewer.isSubscriber" v-bind:class="[ viewer.isSubscriber ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">Subscriber</button>
                  <button type="button" class="border border-left-0 btn" :class="[viewer.haveSubscriberLock ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.haveSubscriberLock = !viewer.haveSubscriberLock">
                    <fa :icon="viewer.haveSubscriberLock ? 'lock' : 'unlock'"></fa>
                  </button>
                </div>
            </div>
            <div class="col">
                <div class="btn-group d-flex" role="group">
                  <button type="button" class="btn btn-block" v-on:click="viewer.isVIP = !viewer.isVIP" v-bind:class="[ viewer.isVIP ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">VIP</button>
                </div>
            </div>
          </div>

          <b-tabs content-class="mt-1" pills>
            <b-tab :title="translate('bits')" active>
              <table class="table table-sm ml-2 mr-2" v-if="viewer.bits.length !== 0">
                <tr v-for="(bits, index) of viewer.bits" :key="bits.cheeredAt">
                  <td scope="row">
                    <datetime
                      v-if="editingBitsIds.includes(index)"
                      v-model="bits.cheeredAt"
                      :config="dateTimePickerConfigBitsTips"
                      class="form-control w-auto"/>
                    <template v-else>
                      {{ moment(bits.cheeredAt).format('LLL') }}
                    </template>
                  </td>
                  <td>
                    <input type="number" min="0" v-model="bits.amount" v-if="editingBitsIds.includes(index)" class="form-control">
                    <strong v-else>{{ Number(bits.amount) }}</strong>
                  </td>
                  <td>
                    <textarea v-model="bits.message" class="form-control" v-if="editingBitsIds.includes(index)" style="height:38px"></textarea>
                    <span v-else>{{ bits.message }}</span>
                  </td>
                  <td class="text-right">
                    <template v-if="!editingBitsIds.includes(index)">
                      <b-dropdown variant="light" toggle-class="text-decoration-none" no-caret>
                        <template v-slot:button-content>
                          <fa icon="ellipsis-v"></fa>
                        </template>
                        <b-dropdown-item @click="editingBitsIds = xor(editingBitsIds, [index]); pending = true"><fa icon="edit" fixed-width></fa> {{ translate('dialog.buttons.edit') }}</b-dropdown-item>
                        <b-dropdown-item @click="removeBits(index)"><fa icon="trash-alt" fixed-width></fa> {{ translate('dialog.buttons.delete') }}</b-dropdown-item>
                      </b-dropdown>
                    </template>
                    <span v-else>
                      <button
                        type="button"
                        @click="editingBitsIds = xor(editingBitsIds, [index])"
                        class="btn btn-block btn-outline-dark border-0 h-100 small-spaced">DONE</button>
                    </span>
                  </td>
                </tr>
              </table>
              <button type="button" class="btn btn-outline-dark border-0 ml-1 mb-3 small-spaced" @click="pending = true; viewer.bits.push({cheeredAt: Date.now(), amount: 0, message: ''})">
                <fa class="pr-1" fixed-width icon="plus"></fa>
                Add bits
              </button>
            </b-tab>
            <b-tab :title="translate('tips')">
              <table class="table table-sm ml-2 mr-2" v-if="viewer.tips.length !== 0">
                <tr v-for="(tips, index) of viewer.tips" :key="tips.tippedAt">
                  <td scope="row">
                    <datetime
                      v-if="editingTipsIds.includes(index)"
                      v-model="tips.tippedAt"
                      :config="dateTimePickerConfigBitsTips"
                      class="form-control w-auto"/>
                    <template v-else>
                      {{ moment(tips.tippedAt).format('LLL') }}
                    </template>
                  </td>
                  <td>
                    <div class="d-flex">
                      <template v-if="editingTipsIds.includes(index)">
                        <input type="number" min="0" v-model="tips.amount" class="form-control">
                        <select class="form-control" v-model="tips.currency">
                          <option value="USD">USD</option>
                          <option value="AUD">AUD</option>
                          <option value="BGN">BGN</option>
                          <option value="BRL">BRL</option>
                          <option value="CAD">CAD</option>
                          <option value="CHF">CHF</option>
                          <option value="CNY">CNY</option>
                          <option value="CZK">CZK</option>
                          <option value="DKK">DKK</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="HKD">HKD</option>
                          <option value="HRK">HRK</option>
                          <option value="HUF">HUF</option>
                          <option value="IDR">IDR</option>
                          <option value="ILS">ILS</option>
                          <option value="INR">INR</option>
                          <option value="ISK">ISK</option>
                          <option value="JPY">JPY</option>
                          <option value="KRW">KRW</option>
                          <option value="MXN">MXN</option>
                          <option value="MYR">MYR</option>
                          <option value="NOK">NOK</option>
                          <option value="NZD">NZD</option>
                          <option value="PHP">PHP</option>
                          <option value="PLN">PLN</option>
                          <option value="RON">RON</option>
                          <option value="RUB">RUB</option>
                          <option value="SEK">SEK</option>
                          <option value="SGD">SGD</option>
                          <option value="THB">THB</option>
                          <option value="TRY">TRY</option>
                          <option value="ZAR">ZAR</option>
                        </select>
                      </template>
                      <strong v-else>{{ Number(tips.amount).toFixed(2) }}{{ tips.currency }}</strong>
                    </div>
                  <td>
                    <template v-if="editingTipsIds.includes(index)">
                      <textarea v-model="tips.message" class="form-control" style="height:38px"></textarea>
                    </template>
                    <span v-else>{{ tips.message }}</span>
                  <td class="text-right">
                    <template v-if="!editingTipsIds.includes(index)">
                      <b-dropdown variant="light" toggle-class="text-decoration-none" no-caret>
                        <template v-slot:button-content>
                          <fa icon="ellipsis-v"></fa>
                        </template>
                        <b-dropdown-item @click="editingTipsIds = xor(editingTipsIds, [index]); pending = true"><fa icon="edit" fixed-width></fa> {{ translate('dialog.buttons.edit') }}</b-dropdown-item>
                        <b-dropdown-item @click="removeTips(index)"><fa icon="trash-alt" fixed-width></fa> {{ translate('dialog.buttons.delete') }}</b-dropdown-item>
                      </b-dropdown>
                    </template>
                    <span v-else>
                      <button
                        type="button"
                        @click="editingTipsIds = xor(editingTipsIds, [index])"
                        class="btn btn-block btn-outline-dark border-0 h-100 small-spaced">DONE</button>
                    </span>
                  </td>
                </tr>
              </table>
              <button type="button" class="btn btn-outline-dark border-0 ml-1 mb-3 small-spaced" @click="pending = true; viewer.tips.push({ tippedAt: Date.now(), amount: 0, currency: configuration.currency, message: ''})">
                <fa class="pr-1" fixed-width icon="plus"></fa>
                Add tip
              </button>
            </b-tab>
            <b-tab :title="translate('managers.viewers.eventHistory')">
              <b-table :items="events" :fields="fields" class="table-p-0" :per-page="historyPerPage" :current-page="historyCurrentPage">
                <template v-slot:cell(timestamp)="data">
                  {{ moment(data.item.timestamp).format('LLL') }}
                </template>
                <template v-slot:cell(event)="data">
                  <strong>{{data.item.event}}</strong>
                </template>
                <template v-slot:cell(info)="data">
                  <template v-if="data.item.event === 'raid' || data.item.event === 'host'">
                    {{ translate('managers.viewers.hostAndRaidViewersCount').replace('$value', JSON.parse(data.item.values_json).viewers) }}
                  </template>
                  <template v-else-if="data.item.event === 'subgift'">
                    <div v-if="data.item.username === viewer.username" v-html="translate('managers.viewers.receivedSubscribeFrom').replace('$value', JSON.parse(data.item.values_json).from)" />
                    <div v-else v-html="translate('managers.viewers.giftedSubscribeTo').replace('$value', data.item.username)" />
                  </template>
                </template>
              </b-table>
              <b-pagination
                v-model="historyCurrentPage"
                :total-rows="events.length || 0"
                :per-page="historyPerPage"
                style="text-align: center; margin: auto; width: fit-content;"
                class="pb-2"
              ></b-pagination>
            </b-tab>
          </b-tabs>
        </form>
      </div>
    </template>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { orderBy, remove, xor } from 'lodash';

import VueFlatPickr from 'vue-flatpickr-component';
import 'flatpickr/dist/flatpickr.css';

import moment from 'moment';
import { UserInterface } from 'src/bot/database/entity/user';
import type { EventListInterface } from 'src/bot/database/entity/eventList';

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faLock, faUnlock,
} from '@fortawesome/free-solid-svg-icons';
library.add(faLock, faUnlock);

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    datetime: VueFlatPickr,
  }
})
export default class viewersEdit extends Vue {
  moment = moment;
  orderBy = orderBy;
  xor = xor;

  socket = getSocket('/core/users');
  socketEventList = getSocket('/overlays/eventlist');

  viewer: UserInterface | null = null;
  watchedTime: any = null;

  editingTipsIds: number[] = [];
  editingBitsIds: number[] = [];

  dateTimePickerConfig = {
    enableTime: true,
    enableSeconds: true,
    maxDate: Date.now()
  }

  dateTimePickerConfigBitsTips = {
    defaultDate: Date.now(),
    enableTime: true,
    enableSeconds: true,
  }

  events: Required<EventListInterface>[] = []
  fields = [
    { key: 'timestamp', sortable: true },
    { key: 'event' },
    { key: 'info', label: '' },
  ];
  historyCurrentPage = 0;
  historyPerPage = 10;

  state: {
    loading: number;
    save: number;
    pending: boolean;
    forceCheckFollowedAt: boolean;
  } = {
    loading: this.$state.progress,
    save: this.$state.idle,
    pending: false,
    forceCheckFollowedAt: false,
  }

  forceCheckFollowedAt() {
    if (this.viewer) {
      this.state.pending = true
      this.state.forceCheckFollowedAt = true
      this.socket.emit('viewers::followedAt', this.viewer.userId, (err, followed_at) => {
        this.state.forceCheckFollowedAt = false
        if (err) return console.error(err)
        else if (this.viewer) {
          this.viewer.followedAt = followed_at;
        }
      })
    }
  }

  removeBits(id) {
    if (this.viewer) {
      remove(this.viewer.bits, (_v, idx) => idx === id);
      this.$forceUpdate();
    }
    this.state.pending = true
  }

  removeTips(id) {
    if (this.viewer) {
      remove(this.viewer.tips, (_v, idx) => idx === id);
      this.$forceUpdate();
    }
    this.state.pending = true
  }

  del() {
    this.socket.emit('viewers::remove', this.viewer, (err) => {
      this.$router.push({ name: 'viewersManagerList' })
    })
  }

  save() {
    this.state.save = this.$state.progress
    this.socket.emit('viewers::save', this.viewer, (err, viewer) => {
      if (err) {
        console.error(err)
        return this.state.save = this.$state.fail;
      }
      this.state.save = this.$state.success;
      this.viewer = viewer; // replace with new data (e.g. ids on tips etc)
      this.$nextTick(() => { this.state.pending = false });
      setTimeout(() => this.state.save = this.$state.idle, 1000)
    })
  }

  @Watch('watchedTime')
  _watchedTime(val, old) {
    if (this.viewer) {
      this.viewer.watchedTime = val * 60 * 60 * 1000;
    }
  }

  @Watch('viewer', { deep: true })
  setPending() { this.state.pending = true; }

  @Watch('viewer.bits', { deep: true })
  _watchBits(val, old) {
    if (this.viewer) {
      this.state.pending = true;
      for (const v of val) {
        v.cheeredAt = (new Date(v.cheeredAt)).getTime()
      }
    }
  }

  @Watch('viewer.tips', { deep: true })
  _watchTips(val, old) {
    if (this.viewer) {
      this.state.pending = true;
      for (const v of val) {
        console.log({v})
        v.tippedAt = (new Date(v.tippedAt)).getTime()
      }
    }
  }

  @Watch('viewer.followedAt')
  _watchTimeFollow(val, old) {
    if (this.viewer) {
      if (val === null || this.viewer.followedAt === new Date(val).getTime()) {
        return
      }
      this.state.pending = true;
      this.viewer.followedAt = new Date(val).getTime();
    }
  }

  @Watch('viewer.subscribedAt')
  _watchTimeSub(val, old) {
    if (this.viewer) {
      if (val === null || this.viewer.subscribedAt === new Date(val).getTime()) {
        return
      }
      this.state.pending = true;
      this.viewer.subscribedAt = new Date(val).getTime();
    }
  }

  get lastSeen() {
    if (!this.viewer || this.viewer.seenAt === 0) {
      return '';
    } else {
      return moment(this.viewer.seenAt).format('HH:mm:ss, YYYY-MM-DD');
    }
  }

  get followedAt() {
    if (!this.viewer || this.viewer.followedAt === 0) {
      return '';
    } else {
      return this.viewer.followedAt;
    }
  }


  set followedAt(val) {
    if (this.viewer) {
      this.viewer.followedAt = Number(val);
    }
  }

  get subscribedAt() {
    if (!this.viewer || this.viewer.subscribedAt === 0) {
      return '';
    } else {
      return this.viewer.subscribedAt;
    }
  }


  set subscribedAt(val) {
    if (this.viewer) {
      this.viewer.subscribedAt = Number(val);
    }
  }

  @Watch('viewer.tips', { deep: true })
  @Watch('viewer.bits', { deep: true })
  updateOrder() {
    if (this.viewer) {
      if (this.viewer.bits.length > 0 && this.viewer.bits[0].cheeredAt !== orderBy(this.viewer.bits, 'cheeredAt', 'desc')[0].cheeredAt) {
        this.viewer.bits = orderBy(this.viewer.bits, 'cheeredAt', 'desc');
      }
      if (this.viewer.tips.length > 0 && this.viewer.tips[0].tippedAt !== orderBy(this.viewer.tips, 'tippedAt', 'desc')[0].tippedAt) {
        this.viewer.tips = orderBy(this.viewer.tips, 'tippedAt', 'desc');
      }
    }
  }

  async created() {
    this.state.loading = this.$state.progress;
    await new Promise((resolve, reject) => {
      this.socket.emit('viewers::findOne', this.$route.params.id, (err, data) => {
        if (err) {
          reject(console.error(err));
        }
        data.tips = orderBy(data.tips, 'tippedAt', 'desc');
        data.bits = orderBy(data.bits, 'cheeredAt', 'desc');
        console.log('Loaded viewer', data);
        this.viewer = data
        this.watchedTime = Number(data.watchedTime / (60 * 60 * 1000)).toFixed(1);
        resolve();
      })
    });
    await new Promise((resolve, reject) => {
      if (this.viewer) {
        this.socketEventList.emit('eventlist::getUserEvents', this.viewer.username, (events: Required<EventListInterface>[]) => {
          this.events = events;
          resolve();
        })
      } else {
        resolve();
      }
    });

    this.state.loading = this.$state.success;
    this.$nextTick(() => { this.state.pending = false })
  }

  beforeRouteUpdate(to, from, next) {
    if (this.state.pending) {
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
    if (this.state.pending) {
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
}
</script>