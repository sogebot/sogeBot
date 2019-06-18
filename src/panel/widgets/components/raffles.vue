<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#raffles-participants" aria-controls="home" role="tab" data-toggle="tab" title="Participants">
          <small>{{ participants.length }}</small>
          <fa icon="users"></fa>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#raffles-giveaway" aria-controls="home" role="tab" data-toggle="tab" title="Giveaway">
          <fa icon="gift"></fa>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#raffles-winner" aria-controls="home" role="tab" data-toggle="tab" title="Last winner" v-if="winner">
          <fa icon="trophy"></fa>
          {{ winner.username }}
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#raffles-settings" aria-controls="home" role="tab" data-toggle="tab" title="Settings">
          <fa icon="cog"></fa>
        </a>
      </li>
      <li role="presentation" class="nav-item widget-popout">
        <a class="nav-link" title="Popout" target="_blank" href="/popout/#raffles">
          <fa icon="external-link-alt"></fa>
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title">{{commons.translate('widget-title-raffles')}}</h6>
      </li>
    </ul>
  </div>

  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane" id="raffles-participants">
        <div class="input-group">
          <input type="text" class="form-control" :placeholder="commons.translate('placeholder-search')" v-model="search">
          <span class="input-group-btn">
            <button class="btn btn-danger" type="button" title="Cancel search" @click="search = ''">
              <fa icon="trash"></fa>
            </button>
          </span>
        </div>
        <ul class="list-unstyled p-2">
          <li v-for="participant of fParticipants" :key="participant._id" style="cursor: pointer" @click="toggleEligibility(participant)">
            <fa
              :class="[participant.eligible ? 'text-success': '']"
              :icon="['far', participant.eligible ? 'check-circle' : 'circle']"></fa>
            {{ participant.username }}
          </li>
          <li class="text-danger">
            <fa icon="eye-slash"></fa>
            {{Math.abs(fParticipants.length - participants.length)}} {{commons.translate('hidden')}}
          </li>
        </ul>
      </div>
      <!-- /PARTICIPANTS -->

      <div role="tabpanel" class="tab-pane active" id="raffles-giveaway">
        <div class="input-group">
          <span class="input-group-btn btn-group">
            <button class="btn btn-success" type="button"
              :disabled="keyword.trim().length <= 1 || running"
              @click="open()">
                <fa icon="plus" fixed-width></fa>
            </button>
            <button class="btn btn-danger" type="button"
              :disabled="!running"
              @click="close()">
                <fa icon="trash" fixed-width></fa>
            </button>
          </span>
          <div class="input-group-prepend">
              <span class="input-group-text">!</span>
          </div>
          <input type="text" class="form-control" :placeholder="commons.translate('placeholder-enter-keyword')" v-model="keyword" :disabled="running">
          <span class="input-group-btn btn-group">
            <button type="button" class="btn btn-success" :disabled="!running" @click="socket.emit('pick')">
              <fa icon="trophy" fixed-width></fa>
            </button>
          </span>
        </div>

        <div class="row pb-1">
          <div class="col">
          </div>
          <div class="w-100"></div>
          <div class="col text-center">
            <div class="d-flex">
            <button type="button" class="btn btn-default btn-label w-100 text-left" disabled="disabled">{{commons.translate('eligible-to-enter')}}</button>
            <button
              class="btn d-block border-0 w-100" style="flex-shrink: 2;"
              :class="[ eligibility.all ? 'btn-outline-success' : 'btn-outline-danger' ]"
              @click="toggle('all')"
              :title="commons.translate('everyone')"
              :disabled="running">
              <fa icon="users" />
            </button>
            <button
              class="btn d-block border-0 w-100" style="flex-shrink: 2;"
              :class="[ eligibility.followers ? 'btn-outline-success' : 'btn-outline-danger' ]"
              @click="toggle('followers')"
              :title="commons.translate('followers')"
              :disabled="running">
              <fa icon="heart" />
            </button>
            <button
              class="btn d-block border-0 w-100" style="flex-shrink: 2;"
              :class="[ eligibility.subscribers ? 'btn-outline-success' : 'btn-outline-danger' ]"
              @click="toggle('subscribers')"
              :title="commons.translate('subscribers')"
              :disabled="running">
              <fa icon="star" />
            </button>
            </div>
          </div>
        </div>

        <div class="row pb-1">
          <div class="col">
            <div class="d-flex">
              <button type="button" class="btn btn-default btn-label w-100 text-left" disabled="disabled">{{commons.translate('raffle-type')}}</button>
              <button class="btn d-block w-100"
                :class="[isTypeKeywords ? 'btn-primary' : 'btn-outline-primary border-0']"
                @click="isTypeKeywords = true"
                :disabled="running">
                {{commons.translate('raffle-type-keywords')}}
              </button>
              <button class="btn d-block w-100"
                :class="[isTypeKeywords ? 'btn-outline-primary border-0' : 'btn-primary']"
                @click="isTypeKeywords = false"
                :disabled="running">
                {{commons.translate('raffle-type-tickets')}}
              </button>
            </div>
          </div>
        </div>

        <div class="row" v-if="!isTypeKeywords">
          <div class="col">
            <div class="d-flex">
              <button type="button" class="btn btn-default btn-label w-50 text-left" disabled>{{commons.translate('raffle-tickets-range')}}</button>
              <div class="w-100">
                <div class="input-group">
                  <div class="input-group-prepend">
                    <span class="input-group-text">min</span>
                  </div>
                  <input type="number" v-model="ticketsMin" class="form-control" placeholder="0" id="minTickets" min="0" :disabled="running">
                </div>
                <div class="input-group">
                  <div class="input-group-prepend">
                      <span class="input-group-text">max</span>
                  </div>
                  <input type="number" v-model="ticketsMax" class="form-control" placeholder="100" id="maxTickets" min="0" :disabled="running">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- /GIVEAWAY -->
      <div role="tabpanel" class="tab-pane" id="raffles-winner">
        <template v-if="winner">
          <div style="text-align: center">
            <strong style="font-size: 30px">
            <fa :icon="['fab', 'twitch']"></fa>
              {{winner.username}}
            </strong>
          </div>

          <div class="text-center">
            <div class="d-flex">
              <div class="w-100 btn" style="cursor: initial" :class="[winner.is.follower ? 'text-success' : 'text-danger']">{{commons.translate('follower')}}</div>
              <div class="w-100 btn" style="cursor: initial" :class="[winner.is.subscriber ? 'text-success' : 'text-danger']">{{commons.translate('subscriber')}}</div>
              <button type="button" class="btn btn-outline-secondary border-0 btn-block" @click="socket.emit('pick')">
                <fa icon="sync"></fa>
                {{commons.translate('roll-again')}}
              </button>
            </div>
          </div>

          <div class="table-responsive" style="margin-top: 0; padding-left: 10px; padding-right: 10px;">
            <table class="table table-sm">
              <thead>
                <tr>
                  <td colspan="2" style="vertical-align: bottom; font-size: 18px;">
                  <fa icon="comments"></fa>
                  {{commons.translate('messages')}}
                  </td>
                </tr>
              </thead>
              <tbody style="font-size:10px;">
                <tr v-for="(message, index) of winnerMessages" :key="index">
                  <td>{{message.text}}</td>
                  <td class="text-right"><small class="text-muted">{{ new Date(message.timestamp).toLocaleTimeString()}}</small></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
      <!-- /WINNER -->
      <div role="tabpanel" class="tab-pane" id="raffles-settings">
        <div class="input-group">
          <div class="input-group-prepend">
              <span class="input-group-text">{{commons.translate('announce-every')}}</span>
          </div>
          <input type="text" class="form-control" v-model="raffleAnnounceInterval">
          <div class="input-group-append">
              <span class="input-group-text">{{commons.translate('minutes')}}</span>
          </div>
        </div>

        <div class="input-group mt-2">
          <div class="input-group-prepend">
              <span class="input-group-text">{{commons.translate('systems.raffles.widget.subscribers-luck')}}</span>
          </div>
          <input type="text" class="form-control" v-model="luck.subscribersPercent">
          <div class="input-group-append">
              <span class="input-group-text">%</span>
          </div>
        </div>

        <div class="input-group mt-2">
          <div class="input-group-prepend">
              <span class="input-group-text">{{commons.translate('systems.raffles.widget.followers-luck')}}</span>
          </div>
          <input type="text" class="form-control" v-model="luck.followersPercent">
          <div class="input-group-append">
              <span class="input-group-text">%</span>
          </div>
        </div>
      </div>
      <!-- /SETTINGS -->

      <div class="clearfix"></div>
    </div>
  </div>
</div>
</template>

<script>
export default {
  props: ['commons', 'token'],
  mounted: function () {
    this.$emit('mounted')
  },
  data: function () {
    return {
      raffleAnnounceInterval: 0,
      luck: {
        subscribersPercent: 0,
        followersPercent: 0
      },

      search: '',

      eligibility: {
        all: true,
        followers: false,
        subscribers: false
      },

      isTypeKeywords: true,
      keyword: '',
      running: false,
      ticketsMax: 100,
      ticketsMin: 0,
      winner: null,
      participants: [],

      socket: io('/systems/raffles', {query: "token=" + this.token}),
      updated: String(new Date())
    }
  },
  computed: {
    fParticipants: function () {
      if (this.search.trim().length === 0) return this.participants
      else {
        return this.participants.filter(o => o.username.includes(this.search.trim()))
      }
    },
    winnerMessages: function () {
      if (this.winner) {
        return this.participants.filter(o => o.username === this.winner.username)[0].messages
      } else return []
    }
  },
  created: function () {
    this.socket.emit('settings', (err, data) => {
      this.raffleAnnounceInterval = data.raffleAnnounceInterval
      this.luck.subscribersPercent = data.subscribersPercent
      this.luck.followersPercent = data.followersPercent
    })

    if (localStorage.getItem('/widget/raffles/eligibility/all')) this.eligibility.all = JSON.parse(localStorage.getItem('/widget/raffles/eligibility/all'))
    if (localStorage.getItem('/widget/raffles/eligibility/followers')) this.eligibility.followers = JSON.parse(localStorage.getItem('/widget/raffles/eligibility/followers'))
    if (localStorage.getItem('/widget/raffles/eligibility/subscribers')) this.eligibility.subscribers = JSON.parse(localStorage.getItem('/widget/raffles/eligibility/subscribers'))

    this.refresh()
  },
  watch: {
    raffleAnnounceInterval: function (val) {
      this.socket.emit('settings.update', { raffleAnnounceInterval: val }, () => {})
    },
    'luck.followersPercent': function () {
      this.socket.emit('settings.update', { luck: this.luck }, () => {})
    },
    'luck.subscribersPercent': function () {
      this.socket.emit('settings.update', { luck: this.luck }, () => {})
    },
    ticketsMin: function () { this.ticketsMin = Number(this.ticketsMin) },
    ticketsMax: function () { this.ticketsMax = Number(this.ticketsMax) },
    keyword: function () {
      if (!this.keyword.startsWith('!')) this.keyword = '!' + this.keyword
    }
  },
  methods: {
    refresh: async function () {
      await Promise.all([
        new Promise((resolve) => {
          this.socket.emit('find', {}, (err, raffles) => {
            const raffle = _.orderBy(raffles, 'timestamp', 'desc')[0]
            if (!_.isEmpty(raffle)) {
              this.running = !raffle.winner
              if (!raffle.winner) {
                this.keyword = raffle.keyword
                this.isTypeKeywords = raffle.type === 0
                this.ticketsMax = raffle.max
                this.ticketsMin = raffle.min
                this.winner = null

                // set eligibility
                if (!raffle.subscribers && !raffle.followers) {
                  this.eligibility.all = false
                  this.toggle('all') // enable all
                } else {
                  this.eligibility.followers = !raffle.followers
                  this.eligibility.subscribers = !raffle.subscribers
                  this.toggle('followers')
                  this.toggle('subscribers')
                }
              } else {
                if (this.winner === null) {
                  this.socket.emit('findOne', { collection: '_users', where: {username: raffle.winner}}, (err, user) => this.winner = user)
                }
              }
            }
            resolve()
          })
        }),
        new Promise((resolve) => {
          this.socket.emit('find', { collection: 'participants' }, (err, data) => {
            this.participants = data
            resolve()
          })
        })
      ])

      setTimeout(() => this.refresh(), 1000)
    },
    toggleEligibility: function (participant) {
      this.socket.emit('update', { collection: 'participants', items: [{_id: String(participant._id), eligible: !participant.eligible}] })
      participant.eligible = !participant.eligible
    },
    toggle: function (pick) {
      Vue.set(this.eligibility, pick, !this.eligibility[pick])
      if (pick === 'all' && this.eligibility[pick]) {
        this.eligibility.followers = false
        this.eligibility.subscribers = false
      }
      if (!this.eligibility.all && !this.eligibility.followers && !this.eligibility.subscribers) this.eligibility.all = true
      if (this.eligibility.followers || this.eligibility.subscribers) this.eligibility.all = false
      this.updated = String(new Date())

      localStorage.setItem('/widget/raffles/eligibility/all', JSON.stringify(this.eligibility.all))
      localStorage.setItem('/widget/raffles/eligibility/followers', JSON.stringify(this.eligibility.followers))
      localStorage.setItem('/widget/raffles/eligibility/subscribers', JSON.stringify(this.eligibility.subscribers))
    },
    open: function () {
      let out = []
      out.push(this.keyword)
      if (this.eligibility.followers || this.eligibility.subscribers) out.push('-for ' + (this.eligibility.followers ? 'followers' : ' ') + (this.eligibility.subscribers ? 'subscribers' : ' '))

      if (!this.isTypeKeywords) {
        out.push(`-min ${this.ticketsMin}`)
        out.push(`-max ${this.ticketsMax}`)
      }
      console.group('raffles open()')
      console.debug('out: ', out.join(' '))
      console.groupEnd()
      this.socket.emit('open', out.join(' '))
    },
    close: function () {
      this.socket.emit('close')
      this.running = false
    }
  }
}
</script>
