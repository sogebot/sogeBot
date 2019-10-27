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
          <hold-button :if="$route.params.id || null" @trigger="del()" icon="trash" class="btn-shrink btn-danger">
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
                <date-picker
                  class="form-control p-0"
                  :disabled="viewer.lock.followed_at"
                  v-model="viewer.time.follow"
                  :first-day-of-week="1"
                  :not-after="new Date().getTime()"
                  format="HH:mm:ss, YYYY-MM-DD"
                  lang="en"
                  type="datetime"
                  input-class="mx-input border-0"></date-picker>
                <div class="input-group-append">
                  <button type="button" class="border border-left-0 btn" :class="[viewer.lock.followed_at ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.lock.followed_at = !viewer.lock.followed_at">
                    <fa :icon="[viewer.lock.followed_at ? 'lock' : 'unlock']"></fa>
                  </button>
                </div>
              </div>
            </div>
            <div class="form-group col">
              <label>{{ translate('subscribed-since') }}</label>
              <div class="input-group">
                <date-picker
                  class="form-control p-0"
                  :disabled="viewer.lock.subscribed_at"
                  v-model="viewer.time.subscribed_at"
                  :first-day-of-week="1"
                  :not-after="new Date().getTime()"
                  format="HH:mm:ss, YYYY-MM-DD"
                  lang="en"
                  type="datetime"
                  input-class="mx-input border-0"></date-picker>
                <div class="input-group-append">
                  <button type="button" class="btn border" :class="[viewer.lock.subscribed_at ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.lock.subscribed_at = !viewer.lock.subscribed_at">
                    <fa :icon="[viewer.lock.subscribed_at ? 'lock' : 'unlock']"></fa>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-row pl-2 pr-2">
            <div class="form-group col">
              <label>{{ translate('message') }}</label>
              <input v-model="viewer.stats.messages" type="text" class="form-control">
            </div>
            <div class="form-group col">
              <label>{{ translate('points') }}</label>
              <input v-model="viewer.points" type="text" class="form-control">
            </div>
            <div class="form-group col">
              <label>{{ translate('watched-time') }} <small>{{ translate('hours') }}</small></label>
              <input v-model="watchedTime" type="text" class="form-control">
            </div>
            <div class="form-group col">
              <label>{{ translate('subgifts') }}</label>
              <input v-model="viewer.custom.subgiftsCount" type="text" class="form-control" readonly="true">
            </div>
            <div class="form-group col">
              <label>{{ translate('subCumulativeMonths') }}</label>
              <input v-model="viewer.stats.subCumulativeMonths" type="text" class="form-control" readonly="true">
            </div>
            <div class="form-group col">
              <label>{{ translate('subStreak') }}</label>
              <input v-model="viewer.stats.subStreak" type="text" class="form-control" readonly="true">
            </div>
          </div>

          <div class="row">
            <div class="col-md col-sm-12">
              <div class="form-row pl-2 pr-2">
                <div class="col">
                  <label>{{ translate('bits') }}</label>
                </div>
              </div>

              <table class="table table-sm ml-2 mr-2" v-if="viewer.stats.bits.length !== 0">
                <tr v-for="bits of orderBy(viewer.stats.bits, 'timestamp', 'desc')" :key="bits.timestamp">
                  <td scope="row">{{ moment(bits.timestamp).format('LLL') }}</td>
                  <td>
                    <input type="number" min="0" v-model="bits.amount" v-if="bits.editation" class="form-control">
                    <strong v-else>{{ Number(bits.amount) }}</strong>
                  </td>
                  <td>
                    <textarea v-model="bits.message" class="form-control" v-if="bits.editation" style="height:38px"></textarea>
                    <span v-else>{{ bits.message }}</span>
                  </td>
                  <td class="text-right">
                    <template v-if="!bits.editation">
                      <b-dropdown variant="light" toggle-class="text-decoration-none" no-caret>
                        <template v-slot:button-content>
                          <fa icon="ellipsis-v"></fa>
                        </template>
                        <b-dropdown-item @click="bits.editation = true; pending = true"><fa icon="edit" fixed-width></fa> {{ translate('dialog.buttons.edit') }}</b-dropdown-item>
                        <b-dropdown-item @click="removeBits(bits._id)"><fa icon="trash-alt" fixed-width></fa> {{ translate('dialog.buttons.delete') }}</b-dropdown-item>
                      </b-dropdown>
                    </template>
                    <span v-else>
                      <button
                        type="button"
                        @click="bits.editation = false"
                        class="btn btn-block btn-outline-dark border-0 h-100 small-spaced">DONE</button>
                    </span>
                  </td>
                </tr>
              </table>
              <button type="button" class="btn btn-outline-dark border-0 ml-1 mb-3 small-spaced" @click="pending = true; viewer.stats.bits.push({id: viewer.id, new: true, editation: true, timestamp: Date.now(), amount: 0, message: '', _id: Date.now()})">
                <fa class="pr-1" fixed-width icon="plus"></fa>
                Add bits
              </button>
            </div>
            <div class="col-md col-sm-12">
              <div class="form-row pl-2 pr-2">
                <div class="col">
                  <label>{{ translate('tips') }}</label>
                </div>
              </div>

              <table class="table table-sm ml-2 mr-2" v-if="viewer.stats.tips.length !== 0">
                <tr v-for="tips of orderBy(viewer.stats.tips, 'timestamp', 'desc')" :key="tips.timestamp">
                  <td scope="row">{{ moment(tips.timestamp).format('LLL') }}</td>
                  <td class="d-flex">
                    <template v-if="tips.editation">
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
                  <td>
                    <template v-if="tips.editation">
                      <textarea v-model="tips.message" class="form-control" style="height:38px"></textarea>
                    </template>
                    <span v-else>{{ tips.message }}</span>
                  <td class="text-right">
                    <template v-if="!tips.editation">
                      <b-dropdown variant="light" toggle-class="text-decoration-none" no-caret>
                        <template v-slot:button-content>
                          <fa icon="ellipsis-v"></fa>
                        </template>
                        <b-dropdown-item @click="tips.editation = true; pending = true"><fa icon="edit" fixed-width></fa> {{ translate('dialog.buttons.edit') }}</b-dropdown-item>
                        <b-dropdown-item @click="removeTips(tips._id)"><fa icon="trash-alt" fixed-width></fa> {{ translate('dialog.buttons.delete') }}</b-dropdown-item>
                      </b-dropdown>
                    </template>
                    <span v-else>
                      <button
                        type="button"
                        @click="tips.editation = false"
                        class="btn btn-block btn-outline-dark border-0 h-100 small-spaced">DONE</button>
                    </span>
                  </td>
                </tr>
              </table>
              <button type="button" class="btn btn-outline-dark border-0 ml-1 mb-3 small-spaced" @click="pending = true; viewer.stats.tips.push({id: viewer.id, new: true, editation: true, timestamp: Date.now(), amount: 0, currency: configuration.currency, message: '', _id: Date.now()})">
                <fa class="pr-1" fixed-width icon="plus"></fa>
                Add tip
              </button>
            </div>
          </div>

          <div class="form-row pl-2 pr-2 pb-3">
            <div class="col">
              <div class="btn-group d-flex" role="group">
                <button :disabled="viewer.lock.follower" type="button" class="btn btn-block" v-on:click="viewer.is.follower = !viewer.is.follower" v-bind:class="[ viewer.is.follower ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">Follower</button>
                <button type="button" class="border border-left-0 btn" :class="[viewer.lock.follower ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.lock.follower = !viewer.lock.follower">
                  <fa :icon="[viewer.lock.follower ? 'lock' : 'unlock']"></fa>
                </button>
              </div>
            </div>
            <div class="col">
                <div class="btn-group d-flex" role="group">
                  <button :disabled="viewer.lock.subscriber" type="button" class="btn btn-block" v-on:click="viewer.is.subscriber = !viewer.is.subscriber" v-bind:class="[ viewer.is.subscriber ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">Subscriber</button>
                  <button type="button" class="border border-left-0 btn" :class="[viewer.lock.subscriber ? 'btn-secondary border-0' : 'btn-light']" @click="viewer.lock.subscriber = !viewer.lock.subscriber">
                    <fa :icon="[viewer.lock.subscriber ? 'lock' : 'unlock']"></fa>
                  </button>
                </div>
            </div>
            <div class="col">
                <div class="btn-group d-flex" role="group">
                  <button type="button" class="btn btn-block" v-on:click="viewer.is.vip = !viewer.is.vip" v-bind:class="[ viewer.is.vip ? 'btn-success' : 'btn-danger' ]" aria-hidden="true">VIP</button>
                </div>
            </div>
          </div>
        </form>
      </div>
    </template>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { orderBy, remove, get } from 'lodash';
import DatePicker from 'vue2-datepicker';
import moment from 'moment';

Component.registerHooks([
  'beforeRouteEnter',
  'beforeRouteLeave',
  'beforeRouteUpdate' // for vue-router 2.2+
])

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
    'date-picker': DatePicker,
  }
})
export default class viewersEdit extends Vue {
  moment = moment;
  orderBy = orderBy;

  socket = getSocket('/core/users');

  viewer: any = {};
  watchedTime: any = null;

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
    this.state.pending = true
    this.state.forceCheckFollowedAt = true
    this.socket.emit('followedAt.viewer', this.viewer.id, (err, followed_at) => {
      this.state.forceCheckFollowedAt = false
      if (err) return console.error(err)
      else this.viewer.time.follow = followed_at
    })
  }

  removeBits(_id) {
    remove(this.viewer.stats.bits, (o: any) => o._id === _id);
    this.viewer.stats.bits = [
      ...this.viewer.stats.bits
    ]
    this.state.pending = true
  }

  removeTips(_id) {
    remove(this.viewer.stats.tips, (o: any) => o._id === _id);
    this.viewer.stats.tips = [
      ...this.viewer.stats.tips
    ]
    this.state.pending = true
  }

  del() {
    this.socket.emit('delete.viewer', {_id: this.$route.params.id}, (err) => {
      this.$router.push({ name: 'viewersManagerList' })
    })
  }

  save() {
    this.state.save = this.$state.progress
    const data = {
      _id: this.$route.params.id,
      viewer: this.viewer
    }
    this.socket.emit('update.viewer', {items: [data]}, (err, id) => {
      if (err) {
        console.error(err)
        return this.state.save = this.$state.fail;
      }
      this.state.save = this.$state.success;
      this.$nextTick(() => { this.state.pending = false });
      setTimeout(() => this.state.save = this.$state.idle, 1000)
    })
  }

  @Watch('watchedTime')
  _watchedTime(val, old) {
    this.viewer.time.watched = val * 60 * 60 * 1000
  }

  @Watch('viewer', { deep: true })
  setPending() { this.state.pending = true; }

  @Watch('viewer.time.follow')
  _watchTimeFollow(val, old) {
    if (val === null || this.viewer.time.follow === new Date(val).getTime()) return
    this.state.pending = true
    this.viewer.time.follow = new Date(val).getTime()
    if (this.viewer.time.follow === 0) this.viewer.time.follow = null
  }

  @Watch('viewer.time.subscribed_at')
  _watchTimeSub(val, old) {
    if (val === null || this.viewer.time.subscribed_at === new Date(val).getTime()) return
    this.state.pending = true
    this.viewer.time.subscribed_at = new Date(val).getTime()
    if (this.viewer.time.subscribed_at === 0) this.viewer.time.subscribed_at = null
  }

  get lastSeen() {
    if (get(this, 'viewer.time.message', false)) {
      return moment(this.viewer.time.message).format('HH:mm:ss, YYYY-MM-DD')
    } else return ''
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('findOne.viewer', { where: { id: this.$route.params.id } }, (err, data) => {
      for (let bits of data.stats.bits) {
        // Add for vue have control and watchers
        bits.editation = false
        bits.new = false
      }
      for (let tips of data.stats.tips) {
        // Add for vue have control and watchers
        tips.editation = false
        tips.new = false
      }

      data.time.follow = data.time.follow === 0 ? null : data.time.follow
      this.viewer = data
      this.watchedTime = !data.time.watched ? '0.0' : Number(data.time.watched / (60 * 60 * 1000)).toFixed(1)

      if (typeof this.viewer.custom === 'undefined') this.viewer.custom = {}
      this.viewer.custom.subgiftsCount = !this.viewer.custom.subgiftsCount ? 0 : this.viewer.custom.subgiftsCount
      this.viewer.stats.subStreak = !this.viewer.stats.subStreak ? 0 : this.viewer.stats.subStreak
      this.viewer.stats.subCumulativeMonths = !this.viewer.stats.subCumulativeMonths ? 0 : this.viewer.stats.subCumulativeMonths
      this.state.loading = this.$state.success;
      this.$nextTick(() => { this.state.pending = false })
    })
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