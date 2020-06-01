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
              <template v-if="sort === 'user.username'">{{ translate('username') }}</template>
              <template v-if="sort === 'user.seenAt'">{{ translate('last-seen') }}</template>
              <template v-if="sort === 'user.watchedTime'">{{ translate('watched-time') }}</template>
              <template v-if="sort === 'user.followedAt'">{{ translate('followed-since') }}</template>
              <template v-if="sort === 'user.subscribedAt'">{{ translate('subscribed-since') }}</template>
              <template v-if="sort === 'user.points'">{{ translate('points') }}</template>
              <template v-if="sort === 'user.messages'">{{ translate('messages') }}</template>
              <template v-if="sort === 'sumTips'">{{ translate('tips') }}</template>
              <template v-if="sort === 'sumBits'">{{ translate('bits') }}</template>
              <template v-if="sort === 'user.giftedSubscribes'">{{ translate('subgifts') }}</template>
              <template v-if="sort === 'user.subscribeCumulativeMonths'">{{ translate('subCumulativeMonths') }}</template>
              <template v-if="sort === 'user.subscribeStreak'">{{ translate('subStreak') }}</template>
              <fa icon="sort-down" fixed-width></fa>
            </span>
          </template>
          <b-dropdown-item @click="sort = 'user.username'; sortDesc = false">{{ translate('username') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.seenAt'; sortDesc = true">{{ translate('last-seen') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.watchedTime'; sortDesc = true">{{ translate('watched-time') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.followedAt'; sortDesc = true">{{ translate('followed-since') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.subscribedAt'; sortDesc = true">{{ translate('subscribed-since') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.points'; sortDesc = true">{{ translate('points') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.messages'; sortDesc = true">{{ translate('messages') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'sumTips'; sortDesc = true">{{ translate('tips') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'sumBits'; sortDesc = true">{{ translate('bits') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.giftedSubscribes'; sortDesc = true">{{ translate('subgifts') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.subscribeCumulativeMonths'; sortDesc = true">{{ translate('subCumulativeMonths') }}</b-dropdown-item>
          <b-dropdown-item @click="sort = 'user.subscribeStreak'; sortDesc = true">{{ translate('subStreak') }}</b-dropdown-item>
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
      :fields="fields" :items="fItems"
      @row-clicked="linkTo($event)"
      :sort-by.sync="sort" :sort-desc.sync="sortDesc">
      <template v-slot:cell(username)="data">
        <div class="text-primary font-bigger">{{ data.item.username }}</div>
        <b-badge :class="[ data.item.isOnline ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          active
        </b-badge>
        <b-badge :class="[ data.item.isVIP ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          vip
        </b-badge>
        <b-badge :class="[ data.item.isFollower ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          <fa v-if="data.item.haveFollowerLock" :icon="['fas', 'fa-lock']"></fa>
          follower
        </b-badge>
        <b-badge :class="[ data.item.isSubscriber ? 'badge-success' : 'badge-danger' ]" style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
          <fa v-if="data.item.haveSubscriberLock" :icon="['fas', 'fa-lock']"></fa>
          subscriber
        </b-badge>
      </template>
      <template v-slot:cell(date)="data">
        <div v-if="Number(data.item.seenAt) !== 0">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('last-seen') }}:
          </strong>
          {{ moment(Number(data.item.seenAt)).format('LLL') }}</div>
        <div v-if="data.item.isFollower && Number(data.item.followedAt) !== 0">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            <fa v-if="data.item.haveFollowedAtLock" :icon="['fas', 'fa-lock']"></fa>
            {{ translate('followed-since') }}:
          </strong>
          {{ moment(Number(data.item.followedAt)).format('LLL') }}</div>
        <div v-if="data.item.isSubscriber && Number(data.item.subscribedAt) !== 0">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            <fa v-if="data.item.haveSubscribedAtLock" :icon="['fas', 'fa-lock']"></fa>
            {{ translate('subscribed-since') }}:
          </strong>
          {{ moment(Number(data.item.subscribedAt)).format('LLL') }}
        </div>
      </template>
      <template v-slot:cell(stats)="data">
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('messages') }}:
          </strong>
          {{ data.item.messages }}
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
          {{ (data.item.watchedTime / 1000 / 60 / 60).toFixed(1) }}h
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('tips') }}:
          </strong>
          {{ Number(data.item.sumTips).toFixed(2) }}{{ configuration.currency }}
        </div>
      </template>
      <template v-slot:cell(stats2)="data">
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('bits') }}:
          </strong>
          {{ data.item.sumBits }}
        </div>
        <div v-if="data.item.isSubscriber">
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('tier') }}:
          </strong>
          {{ data.item.subscribeTier }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('subgifts') }}:
          </strong>
          {{ data.item.giftedSubscribes }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('subStreak') }}:
          </strong>
          {{ data.item.subscribeStreak }}
        </div>
        <div>
          <strong style="margin: 0px 0px 3px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            {{ translate('subCumulativeMonths') }}:
          </strong>
          {{ data.item.subscribeCumulativeMonths }}
        </div>
      </template>
    </b-table>
  </b-container>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { get } from 'lodash-es';
import { capitalize } from 'src/panel/helpers/capitalize';
import moment from 'moment';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSortDown, faSortUp, faSortAlphaUp, faSortAlphaDown } from '@fortawesome/free-solid-svg-icons'
import { UserInterface } from '../../../../bot/database/entity/user';

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

  items: Required<UserInterface>[] = []
  count: number = 0;
  search: string = '';

  state: {
    loading: number,
  } = {
    loading: this.$state.progress,
  }

  currentPage = 1;
  perPage = 25;

  sortDesc = false;
  sort = 'user.username';

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
    return this.count;
  }

  get fItems() {
    return this.items;
  }

  @Watch('currentPage')
  @Watch('sort')
  @Watch('sortDesc')
  @Watch('filter', { deep: true })
  @Watch('search')
  refresh() {
    this.state.loading = this.$state.progress;
    this.socket.emit('find.viewers', { page: (this.currentPage - 1), order: {
      orderBy: this.sort, sortOrder: this.sortDesc ? 'DESC' : 'ASC'
    }, filter: this.filter, search: this.search.length > 0 ? this.search : undefined }, (err: string | null, items: Required<UserInterface>[], count: number) => {
      if (err) {
        return console.error(err);
      }
      this.items = items;
      this.count = count;
      this.state.loading = this.$state.success;
      console.timeEnd('find.viewers');
    })
  }

  created() {
    console.time('find.viewers');
    this.state.loading = this.$state.progress;
    this.socket.emit('find.viewers', { page: 0 }, (err: string | null, items: Required<UserInterface>[], count: number) => {
      if (err) {
        return console.error(err);
      }
      this.items = items;
      this.count = count;
      this.state.loading = this.$state.success;
      console.timeEnd('find.viewers');
    })
  }

  resetPoints() {
    this.socket.emit('viewers::resetPointsAll', () => {
      this.refresh();
    })
  }

  resetWatchedTime() {
    this.socket.emit('viewers::resetWatchedTimeAll', () => {
      this.refresh();
    })
  }

  resetMessages() {
    this.socket.emit('viewers::resetMessagesAll', () => {
      this.refresh();
    })
  }

  resetBits() {
    this.socket.emit('viewers::resetBitsAll', () => {
      this.refresh();
    })
  }

  resetTips() {
    this.socket.emit('viewers::resetTipsAll', () => {
      this.refresh();
    })
  }

  linkTo(item: Required<UserInterface>) {
    console.debug('Clicked', item.userId);
    this.$router.push({ name: 'viewersManagerEdit', params: { id: String(item.userId) } });
  }
}
</script>
