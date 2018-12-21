<template>
  <div class="container-fluid" ref="window">
    <div class="row">
      <div class="col-12">
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><i class="fas fa-angle-right"></i></small>
          {{ translate('menu.voting') }}
        </span>
      </div>
    </div>

    <panel ref="panel" class="pt-3 pb-3 mt-3 mb-3 m-0 border-top border-bottom row"
      :options="{ hideNewButton: true, hideTableButton: true }"></panel>

    <template v-for="(chunkVotes, index) of _.chunk(votes, itemsPerPage)">
      <div class="card-deck" v-bind:key="index">
        <template v-for="vote of chunkVotes">
          <template v-if="vote === 'new'">
            <div v-if="isRunning" class="card mb-3 p-0 text-dark" style="flex-direction: inherit;" v-bind:key="String(vote._id)">
              <h6 style="margin: auto; line-height: initial; text-align: center;" class="text-dark p-3">
                <font-awesome-icon icon='ban' size="10x" class="text-danger pb-2"></font-awesome-icon> <br>
                {{ translate('systems.voting.cannotCreateNewVoteIfInProgress') }}
              </h6>
            </div>
            <button v-else-if="!isCreating" class="card mb-3 p-0 border border-primary text-primary" style="flex-direction: inherit;" @click="isCreating = true" v-bind:key="String(vote._id)">
              <h6 style="margin: auto;">
                {{ translate('systems.voting.clickToCreateNewVote') }}
              </h6>
            </button>
            <div v-else class="card mb-3 p-0 border border-primary text-primary" v-bind:key="String(vote._id)">
              <div class="card-body">
                <h5 class="card-title">Novy vote</h5>
              </div>
            </div>
          </template>
          <div class="card mb-3 p-0 border" v-else v-bind:key="String(vote._id)" :class="[vote.isOpened ? 'border-info' : '']">
            <div class="text-info current" v-if="vote.isOpened">
              <font-awesome-icon icon="spinner" spin />
                {{ translate('systems.voting.running') }}
            </div>
            <div class="text-success current" v-else>
              <font-awesome-icon icon="check" />
                {{ translate('systems.voting.done') }}
            </div>
            <div class="card-body">
              <h5 class="card-title">{{ vote.title }}</h5>
              <h6 class="card-subtitle mb-2 text-muted">
                <template v-if="vote.type === 'normal'">
                  <font-awesome-icon icon='terminal'></font-awesome-icon> {{ translate('systems.voting.votingByCommand') }}
                </template>
                <template v-if="vote.type === 'tips'">
                  <font-awesome-icon icon='coins'></font-awesome-icon> {{ translate('systems.voting.votingByTips') }}
                </template>
                <template v-if="vote.type === 'bits'">
                  <font-awesome-icon icon='gem'></font-awesome-icon> {{ translate('systems.voting.votingByBits') }}
                </template>
              </h6>

              <div class="options"
                v-for="(option, index) in vote.options"
                :key="option"
                :class="[index === 0 ? 'first' : '', index === vote.options.length - 1 ? 'last': '']">
                <div class="d-flex" style="width:100%">
                  <div class="w-100">{{option}}</div>
                  <div class="text-right w-100 percentage">{{getPercentage(String(vote._id), index, 1)}}%</div>
                </div>
                <div style="width:100%; position:relative; top:-1rem;">
                  <div class="background-bar"></div>
                  <div class="bar bg-primary"
                    v-bind:style="{
                    'width': getPercentage(String(vote._id), index, 1) === 0 ? '5px' : getPercentage(String(vote._id), index, 1) + '%'
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="d-flex">
                <div style="width: 100%">
                  {{ translate('systems.voting.totalVotes') }}
                  <strong v-if="vote.type !== 'tips'">{{ totalVotes(String(vote._id)) }}</strong>
                  <strong v-else>{{ Number(totalVotes(String(vote._id))).toFixed(1) }}</strong>
                </div>
                <div style="width: 100%" v-if="vote.isOpened">{{ translate('systems.voting.activeFor') }} <strong>{{ activeTime(String(vote._id)) | duration('humanize') }}</strong></div>
                <div style="width: 100%" v-else>{{ translate('systems.voting.closedAt') }} <strong>{{ vote.closedAt | moment('LLL') }}</strong></div>
              </div>
            </div>
            <div class="card-footer">
              <template v-if="vote.isOpened">
                <button type="button" class="btn btn-block btn-danger">
                  <font-awesome-icon icon='stop'></font-awesome-icon> {{ translate('systems.voting.stop') }}
                </button>
              </template>
              <template v-else>
                <button type="button" class="btn btn-block btn-info" style="white-space: normal;" :disabled="isRunning">
                  <font-awesome-icon icon='clone'></font-awesome-icon>
                  <template v-if="isRunning">{{ translate('systems.voting.cannotCopyIfInProgress') }}</template>
                  <template v-else>{{ translate('systems.voting.copy') }}</template>
                </button>
              </template>
            </div>
          </div>
        </template>

        <!-- add empty cards -->
        <template v-if="chunkVotes.length !== itemsPerPage">
          <div class="card" style="visibility: hidden" v-for="i in itemsPerPage - (chunkVotes.length % itemsPerPage)" v-bind:key="i"></div>
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'

  import * as moment from 'moment'
  import VueMoment from 'vue-moment'
  import momentTimezone from 'moment-timezone'

  require('moment/locale/cs')
  require('moment/locale/ru')

  import * as io from 'socket.io-client';

  import { library } from '@fortawesome/fontawesome-svg-core'
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
  import { faTrophy, faClone, faGem, faCoins, faTerminal, faStop, faBan, faSpinner, faCheck, faAngleRight } from '@fortawesome/free-solid-svg-icons';

  library.add(faTrophy, faClone, faGem, faCoins, faTerminal, faStop, faBan, faSpinner, faCheck, faAngleRight)

  Vue.use(VueMoment, {
      moment, momentTimezone
  })

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
      'font-awesome-icon': FontAwesomeIcon
    },
    data: function () {
      const object: {
        socket: any,
        votes: Array<VotingType | 'new'>,
        votings: Array<VoteType>,
        currentTime: any,
        isCreating: Boolean,
        isMounted: Boolean,
        domWidth: Number,
      } = {
        socket: io('/systems/voting', { query: "token=" + this.token}),
        votes: [],
        votings: [],
        currentTime: 0,
        isCreating: false,
        isMounted: false,
        domWidth: 0,
      }
      return object
    },
    mounted: function () {
      this.$moment.locale(this.configuration.lang)
      this.currentTime = Date.now()
      this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth

      setInterval(() => {
        this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
        this.currentTime = Date.now()
      }, 1000)

      this.socket.emit('find', {}, (err, data) => {
        if (err) return console.error(err)
        this.votes = data
        this.votes.unshift('new')
      })
      this.socket.emit('find', { collection: 'votes' }, (err, data) => {
        if (err) return console.error(err)
        this.votings = data
      })

      this.isMounted = true
    },
    computed: {
      itemsPerPage: function () {
        if(!this.isMounted) return 4
        else {
          if (this.domWidth > 1200) return 4
          else if (this.domWidth > 850) return 3
          else return 2
        }
      },
      isRunning: function (): Boolean {
        const running = this.votes.find(o => typeof o !== 'string' && o.isOpened);
        return typeof running !== 'undefined';
      }
    },
    methods: {
      totalVotes: function (vid) {
        let totalVotes = 0
        const filtered = this.votings.filter(o => o.vid === vid)
        for (let i = 0, length = filtered.length; i < length; i++) {
          totalVotes += filtered[i].votes
        }
        return totalVotes
      },
      activeTime: function (vid) {
        const vote = this.votes.find(o => typeof o !== 'string' && String(o._id) === vid);
        if (typeof vote === 'object') {
          return this.currentTime - (new Date(vote.openedAt)).getTime();
        } else {
          return 0;
        }
      },
      getPercentage: function (vid, index, toFixed) {
        let votes = 0
        const filtered = this.votings.filter(o => o.vid === vid)
        for (let i = 0, length = filtered.length; i < length; i++) {
          if (filtered[i].option === index) votes += filtered[i].votes
        }
        return Number((100 / this.totalVotes(vid)) * votes || 0).toFixed(toFixed || 0);
      },
    }
  })
</script>

<style scoped>
  .current {
    font-weight: bold;
    position: absolute;
    font-family: 'PT Sans Narrow', sans-serif;
    right: .4rem;
    font-size: 0.7rem;
    top: 0.2rem;
  }

  .options.first {
    padding-top: 1rem;
  }

  .options.last {
    padding-bottom: 1rem;
  }

  #footer {
    text-align: center;
  }

  .numbers {
    padding: 0 1rem 0 0;
    width: 1%;
  }

  .percentage {
    padding: 0;
    width: 80px;
    text-align: right;
  }

  .background-bar, .bar {
    position: relative;
    top: 1rem;
    height: 1rem;
    width: 100%;
  }

  .bar {
    position: relative;
    top: 0rem;
  }
</style>