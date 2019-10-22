<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.viewers') }}
        </span>
      </b-col>
    </b-row>

    <panel search @search="search = $event">
      <template v-slot:left>
        <b-dropdown no-caret variant="primary">
          <template v-slot:button-content>
            <span class="dropdown-icon">
              <template v-if="sort === 'username'">{{ translate('username') }}</template>
              <template v-if="sort === 'sort.message'">{{ translate('last-seen') }}</template>
              <template v-if="sort === 'sort.watched'">{{ translate('watched-time') }}</template>
              <template v-if="sort === 'sort.follow'">{{ translate('followed-since') }}</template>
              <template v-if="sort === 'sort.subscribed_at'">{{ translate('subscribed-since') }}</template>
              <template v-if="sort === 'points'">{{ translate('points') }}</template>
              <template v-if="sort === 'messages'">{{ translate('messages') }}</template>
              <template v-if="sort === 'stats.tips'">{{ translate('tips') }}</template>
              <template v-if="sort === 'stats.bits'">{{ translate('bits') }}</template>
              <template v-if="sort === 'custom.subgiftCount'">{{ translate('subgifts') }}</template>
              <template v-if="sort === 'stats.subCumulativeMonths'">{{ translate('subCumulativeMonths') }}</template>
              <template v-if="sort === 'stats.subStreak'">{{ translate('subStreak') }}</template>
              <fa icon="sort-down" fixed-width></fa>
            </span>
          </template>
          <b-dropdown-item @click="sort = 'username'; sortDesc = false">{{ translate('username') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'sort.message'; sortDesc = true">{{ translate('last-seen') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'sort.watched'; sortDesc = true">{{ translate('watched-time') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'sort.follow'; sortDesc = true">{{ translate('followed-since') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'sort.subscribed_at'; sortDesc = true">{{ translate('subscribed-since') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'points'; sortDesc = true">{{ translate('points') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'messages'; sortDesc = true">{{ translate('messages') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'stats.tips'; sortDesc = true">{{ translate('tips') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'stats.bits'; sortDesc = true">{{ translate('bits') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'custom.subgiftCount'; sortDesc = true">{{ translate('subgifts') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'stats.subCumulativeMonths'; sortDesc = true">{{ translate('subCumulativeMonths') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'stats.subStreak'; sortDesc = true">{{ translate('subStreak') }}</b-dropdown-item>
        </b-dropdown>

        <b-button variant="primary" @click="sortDesc = !sortDesc">
          <fa :icon="'sort-alpha-' + (sortDesc ? 'up' : 'down')" fixed-width></fa>
        </b-button>

        <b-dropdown no-caret variant="primary">
            <template v-slot:button-content>
              <span class="dropdown-icon">
                {{ capitalize(translate('commons.reset')) }}
                <fa icon="sort-down" fixed-width></fa>
              </span>
            </template>
            <b-dropdown-item @click="resetPoints">{{ translate('points') }}</b-dropdown-item>
            <b-dropdown-item @click="resetWatchedTime">{{ translate('watched-time') }}</b-dropdown-item>
            <b-dropdown-item @click="resetMessages">{{ translate('messages') }}</b-dropdown-item>
            <b-dropdown-item @click="resetBits">{{ translate('bits') }}</b-dropdown-item>
            <b-dropdown-item @click="resetTips">{{ translate('tips') }}</b-dropdown-item>
          </b-dropdown>
      </template>

      <template v-slot:right>
        <b-pagination
          class="m-0"
          v-model="currentPage"
          :total-rows="rows"
          :per-page="perPage"
          aria-controls="my-table"
        ></b-pagination>

        <b-btn-group>
          <button v-if="filter.vips === null" class="btn border-0 btn-outline-dark" @click="filter.vips = true">
            <fa icon="question" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">vip</strong>
          </button>
          <button v-else-if="filter.vips" class="btn border-0 btn-outline-success" @click="filter.vips = false">
            <fa icon="check" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">vip</strong>
          </button>
          <button v-else class="btn border-0 btn-outline-danger" @click="filter.vips = null">
            <fa icon="exclamation" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">vip</strong>
          </button>

          <button v-if="filter.active === null" class="btn border-0 btn-outline-dark" @click="filter.active = true">
            <fa icon="question" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">active</strong>
          </button>
          <button v-else-if="filter.active" class="btn border-0 btn-outline-success" @click="filter.active = false">
            <fa icon="check" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">active</strong>
          </button>
          <button v-else class="btn border-0 btn-outline-danger" @click="filter.active = null">
            <fa icon="exclamation" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">active</strong>
          </button>

          <button v-if="filter.subscribers === null" class="btn border-0 btn-outline-dark" @click="filter.subscribers = true">
            <fa icon="question" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">subscribers</strong>
          </button>
          <button v-else-if="filter.subscribers" class="btn border-0 btn-outline-success" @click="filter.subscribers = false">
            <fa icon="check" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">subscribers</strong>
          </button>
          <button v-else class="btn border-0 btn-outline-danger" @click="filter.subscribers = null">
            <fa icon="exclamation" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">subscriber</strong>
          </button>

          <button v-if="filter.followers === null" class="btn border-0 btn-outline-dark" @click="filter.followers = true">
            <fa icon="question" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">followers</strong>
          </button>
          <button v-else-if="filter.followers" class="btn border-0 btn-outline-success" @click="filter.followers = false">
            <fa icon="check" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">followers</strong>
          </button>
          <button v-else class="btn border-0 btn-outline-danger" @click="filter.followers = null">
            <fa icon="exclamation" fixed-width></fa> <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">follower</strong>
          </button>
        </b-btn-group>
      </template>
    </panel>

    <loading v-if="state.loading !== $state.success" slow/>
    <b-table
      v-else
      hover striped small
      style="cursor: pointer;"
      :fields="fields" :items="fItems" :per-page="perPage" :current-page="currentPage"
      @row-clicked="linkTo($event)"
      :sort-by.sync="sort" :sort-desc.sync="sortDesc">
      <template v-slot:cell(username)="data">
        <div class="text-primary font-bigger">{{ data.item.username }}</div>
        <b-badge :class="[ data.item.online.length > 0 ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          active
        </b-badge>
        <b-badge :class="[ typeof data.item.is === 'object' && data.item.is.vip ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          vip
        </b-badge>
        <b-badge :class="[ typeof data.item.is === 'object' && data.item.is.follower ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          <fa v-if="typeof data.item.lock === 'object' && data.item.lock.follower" :icon="['fas', 'fa-lock']"></fa>
          follower
        </b-badge>
        <b-badge :class="[ typeof data.item.is === 'object' && data.item.is.subscriber ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          <fa v-if="typeof data.item.lock === 'object' && data.item.lock.subscriber" :icon="['fas', 'fa-lock']"></fa>
          subscriber
        </b-badge>
      </template>
      <template v-slot:cell(date)="data">
        <div v-if="typeof data.item.time === 'object' && data.item.time.message">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('last-seen') }}:
          </strong>
          {{ moment(get(data, 'item.time.message', 0)).format('LLL') }}</div>
        <div v-if="typeof data.item.time === 'object' && data.item.time.follow && typeof data.item.is === 'object' && data.item.is.follower">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            <fa v-if="get(data, 'item.lock.followed_at')" :icon=["'fas', 'fa-lock']"></fa>
            {{ translate('followed-since') }}:
          </strong>
          {{ moment(get(data, 'item.time.follow', 0)).format('LLL') }}</div>
        <div v-if="typeof data.item.time === 'object' && data.item.time.subscribed_at && typeof data.item.is === 'object' && data.item.is.subscriber">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
              <fa v-if="get(data, 'item.lock.subscribed_at')" :icon=["'fas', 'fa-lock']"></fa>
            {{ translate('subscribed-since') }}:
          </strong>
          {{ moment(get(data, 'item.time.subscribed_at', 0)).format('LLL') }}
        </div>
      </template>
      <template v-slot:cell(stats)="data">
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('messages') }}:
          </strong>
          {{ get(data, 'item.messages', 0) }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('points') }}:
          </strong>
          {{ data.item.points }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('watched-time') }}:
          </strong>
          {{ (get(data, 'item.time.watched', 0) / 1000 / 60 / 60).toFixed(1) }}h
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('tips') }}:
          </strong>
          {{ Number(data.item.stats.tips).toFixed(2) }}{{ data.item.custom.currency }}
        </div>
      </template>
      <template v-slot:cell(stats2)="data">
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('bits') }}:
          </strong>
          {{ data.item.stats.bits }}
        </div>
        <div v-if="typeof data.item.is === 'object' && data.item.is.subscriber && data.item.stats.tier">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('tier') }}:
          </strong>
          {{ data.item.stats.tier }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('subgifts') }}:
          </strong>
          {{ get(data, 'item.custom.subgiftCount', 0) }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('subStreak') }}:
          </strong>
          {{ get(data, 'item.stats.subStreak', 0) }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('subCumulativeMonths') }}:
          </strong>
          {{ get(data, 'item.stats.subCumulativeMonths', 0) }}
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { isNil, escapeRegExp, get } from 'lodash-es';
import { capitalize } from 'src/panel/helpers/capitalize';
import moment from 'moment';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSortDown, faSortUp, faSortAlphaUp, faSortAlphaDown } from '@fortawesome/free-solid-svg-icons'

library.add(faSortDown, faSortUp, faSortAlphaUp, faSortAlphaDown)

@Component({
  components: {
    'loading': () => import('../../../components/loading.vue'),
  }
})
export default class viewersList extends Vue {
  capitalize = capitalize;
  get = get;
  moment = moment;

  socket = getSocket('/core/users');

  items: any[] = []
  search: string = '';

  state: {
    loading: number,
  } = {
    loading: this.$state.progress,
  }

  currentPage = 1;
  perPage = 30;

  sortDesc = false;
  sort = 'username';

  filter: any = {
    followers: null,
    subscribers: null,
    vips: null,
    active: null
  }

  fields = [
    { key: 'username', label: '' },
    { key: 'date', label: '' },
    { key: 'stats', label: '' },
    { key: 'stats2', label: '' },
  ]

  get rows() {
    return this.items.length;
  }

  get fItems() {
    return this.items.filter((o) => {
      if (!o.username) o.username = ''
      const isSearchInUsername = this.search.length === 0 ? true : !isNil(o.username.match(new RegExp(escapeRegExp(this.search), 'ig')))

      let isActive = true
      if (!isNil(this.filter.active)) {
        if (this.filter.active) {
          isActive = o.online.length > 0
        } else {
          isActive = o.online.length === 0
        }
      }

      let isVIP = true
      if (!isNil(this.filter.vips)) {
        if (this.filter.vips) {
          isVIP = typeof o.is === 'object' && o.is.vip === true
        } else {
          isVIP = typeof o.is !== 'object' || o.is.vip === false
        }
      }

      let isFollower = true
      if (!isNil(this.filter.followers)) {
        if (this.filter.followers) {
          isFollower = typeof o.is === 'object' && o.is.follower === true
        } else {
          isFollower = typeof o.is !== 'object' || o.is.follower === false
        }
      }

      let isSubscriber = true
      if (!isNil(this.filter.subscribers)) {
        if (this.filter.subscribers) {
          isSubscriber = typeof o.is === 'object' && o.is.subscriber === true
        } else {
          isSubscriber = typeof o.is !== 'object' || o.is.subscriber === false
        }
      }
      return isSearchInUsername && isActive && isVIP && isFollower && isSubscriber
    })
  }

  created() {
    console.time('find.viewers');
    this.state.loading = this.$state.progress;
    this.socket.emit('find.viewers', {}, (items) => {
      this.items = items
      this.state.loading = this.$state.success;
      console.timeEnd('find.viewers');
    })
  }

  resetPoints() {
    for (let item of this.items) item.points = 0
    this.socket.emit('delete', { where: {}, collection: '_users.points' })
  }

  resetWatchedTime() {
    for (let item of this.items) item.time.watched = 0
    this.socket.emit('delete', { where: {}, collection: '_users.watched' })
  }

  resetMessages() {
    for (let item of this.items) item.stats.messages = 0
    this.socket.emit('delete', { where: {}, collection: '_users.messages' })
  }

  resetBits() {
    for (let item of this.items) item.stats.bits = 0
    this.socket.emit('delete', { where: {}, collection: '_users.bits' })
  }

  resetTips() {
    for (let item of this.items) item.stats.tips = 0
    this.socket.emit('delete', { where: {}, collection: '_users.tips' })
  }

  linkTo(item) {
    console.debug('Clicked', item.id);
    this.$router.push({ name: 'viewersManagerEdit', params: { id: item.id } });
  }
}
</script>
