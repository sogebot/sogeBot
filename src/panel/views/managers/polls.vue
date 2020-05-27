<template>
  <div class="container-fluid" ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.polls') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'polls').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search cards @search="search = $event"></panel>

    <template v-for="(chunkVotes, index) of chunk(filteredVotes, itemsPerPage)">
      <div class="card-deck" v-bind:key="index">
        <template v-for="vote of chunkVotes">
          <template v-if="vote === 'new'">
            <div v-if="isRunning" class="card mb-3 p-0 text-dark" style="flex-direction: inherit;" v-bind:key="String(vote)">
              <h6 style="margin: auto; line-height: initial; text-align: center;" class="text-dark p-3">
                <fa icon='ban' size="10x" class="text-danger pb-2"></fa> <br>
                {{ translate('systems.polls.cannotCreateNewVoteIfInProgress') }}
              </h6>
            </div>
            <div v-else class="card mb-3 p-0" v-bind:key="String(vote)">
              <div class="card-body">
                <input type="text" style="background-color: transparent; text-transform: inherit; font-size: 1.25rem; position: relative; top: -0.48rem;" class="border-left-0 border-right-0 border-top-0 form-control card-title mb-0" :placeholder="translate('systems.polls.title')" v-model="newVote.title">
                <h6 class="card-subtitle mb-2 text-muted">
                  <template v-if="newVote.type === 'normal'">
                    <fa icon='exclamation'></fa> {{ translate('systems.polls.votingBy') }}
                  </template>
                  <template v-if="newVote.type === 'tips'">
                    <fa icon='coins'></fa> {{ translate('systems.polls.votingBy') }}
                  </template>
                  <template v-if="newVote.type === 'bits'">
                    <fa icon='gem'></fa> {{ translate('systems.polls.votingBy') }}
                  </template>
                  <select v-model="newVote.type" class="text-muted border-left-0 border-right-0 border-top-0" style="background-color: transparent;font-size: .9rem; text-transform: uppercase; font-weight: bold;">
                    <option value="normal">{{ translate('systems.polls.command') }}</option>
                    <option value="tips">{{ translate('systems.polls.tips') }}</option>
                    <option value="bits">{{ translate('systems.polls.bits') }}</option>
                  </select>
                </h6>

                <template v-for="index in newVote.options.length">
                  <input
                    :style="{'margin-top': index === 1 ? '2rem !important' : '0' }"
                    :key="index"
                    :placeholder="'Option ' + index"
                    v-model="newVote.options[index - 1]"
                    type="text"
                    class="form-control mb-2">
                </template>
              </div>

              <div class="card-footer">
                <button type="button" class="btn btn-block btn-success" style="white-space: normal;" :disabled="!atLeastTwoOptions() || newVote.title.trim().length === 0" @click="create()">
                  <fa icon='plus'></fa>
                  <template v-if="newVote.title.trim().length === 0">
                    {{ translate('systems.polls.cannotCreateWithoutTitle')}}
                  </template>
                  <template v-else-if="!atLeastTwoOptions()">
                    {{ translate('systems.polls.cannotCreateIfEmpty')}}
                  </template>
                  <template v-else>
                    {{ translate('systems.polls.create') }}
                  </template>
                </button>
              </div>
            </div>
          </template>
          <div class="card mb-3 p-0 border" v-else v-bind:key="vote.id" :class="[vote.isOpened ? 'border-info' : '']">
            <div class="text-info current" v-if="vote.isOpened">
              <fa icon="spinner" spin />
                {{ translate('systems.polls.running') }}
            </div>
            <div class="text-success current" v-else>
              <fa icon="check" />
                {{ translate('systems.polls.done') }}
            </div>
            <div class="card-body">
              <h5 class="card-title" style="text-transform: inherit;">{{ vote.title }}</h5>
              <h6 class="card-subtitle mb-2 text-muted">
                <template v-if="vote.type === 'normal'">
                  <fa icon='exclamation'></fa> {{ translate('systems.polls.votingBy') }} {{ translate('systems.polls.command') }}
                </template>
                <template v-if="vote.type === 'tips'">
                  <fa icon='coins'></fa> {{ translate('systems.polls.votingBy') }} {{ translate('systems.polls.tips') }}
                </template>
                <template v-if="vote.type === 'bits'">
                  <fa icon='gem'></fa> {{ translate('systems.polls.votingBy') }} {{ translate('systems.polls.bits') }}
                </template>
              </h6>

              <div class="options"
                v-for="(option, index) in vote.options"
                :key="vote.id + option + index"
                :class="[index === 0 ? 'first' : '', index === vote.options.length - 1 ? 'last': '']">
                <div class="d-flex" style="width:100%">
                  <div class="w-100">{{option}}</div>
                  <div class="text-right w-100 percentage">{{getPercentage(vote.id, index, 1)}}%</div>
                </div>
                <div class="pb-2" style="width:100%;">
                  <div class="progress">
                    <div class="progress-bar progress-bar-striped" role="progressbar"
                      :class="[
                        vote.isOpened ? 'progress-bar-animated' : ''
                      ]"
                      :style="{
                        'width': getPercentage(vote.id, index, 1) === 0 ? '5px' : getPercentage(vote.id, index, 1) + '%'
                      }"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="d-flex">
                <div style="width: 100%">
                  {{ translate('systems.polls.totalVotes') }}
                  <strong v-if="vote.type !== 'tips'">{{ totalVotes(vote.id) }}</strong>
                  <strong v-else>{{ Number(totalVotes(vote.id)).toFixed(1) }}</strong>
                </div>
                <div style="width: 100%" v-if="vote.isOpened">{{ translate('systems.polls.activeFor') }} <strong>{{ activeTime(vote.id) | duration('humanize') }}</strong></div>
                <div style="width: 100%" v-else>{{ translate('systems.polls.closedAt') }} <strong>{{ vote.closedAt | moment('LLL') }}</strong></div>
              </div>
            </div>
            <div class="card-footer">
              <template v-if="vote.isOpened">
                <button type="button" class="btn btn-block btn-danger" @click="stop(vote.id)">
                  <fa icon='stop'></fa> {{ translate('systems.polls.stop') }}
                </button>
              </template>
              <template v-else>
                <button type="button" class="btn btn-block btn-info" style="white-space: normal;" :disabled="isRunning" @click="copy(vote.id)">
                  <fa icon='clone'></fa>
                  <template v-if="isRunning">{{ translate('systems.polls.cannotCopyIfInProgress') }}</template>
                  <template v-else>{{ translate('systems.polls.copy') }}</template>
                </button>
              </template>
            </div>
          </div>
        </template>

        <!-- add empty cards -->
        <template v-if="chunkVotes.length !== itemsPerPage">
          <div class="card" style="visibility: hidden" v-for="i in itemsPerPage - (chunkVotes.length % itemsPerPage)" v-bind:key="'item' + i"></div>
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { chunk, cloneDeep, isNil } from 'lodash-es'

  import moment from 'moment'
  import VueMoment from 'vue-moment'
  import momentTimezone from 'moment-timezone'

  require('moment/locale/cs')
  require('moment/locale/ru')

  import { getSocket } from 'src/panel/helpers/socket';
  import { PollInterface } from 'src/bot/database/entity/poll';

  import { v4 as uuid } from 'uuid'

  Vue.use(VueMoment, {
      moment, momentTimezone
  })

  export default Vue.extend({
    components: {
      panel: () => import('../../components/panel.vue'),
    },
    data: function () {
      const object: {
        chunk: any,
        socket: any,
        votes: PollInterface[],
        newVote: PollInterface,
        currentTime: any,
        isMounted: Boolean,
        domWidth: number,
        interval: number,
        search: string,
      } = {
        chunk: chunk,
        socket: getSocket('/systems/polls'),
        votes: [],
        newVote: {
          id: uuid(),
          type: 'normal',
          title: '',
          isOpened: true,
          openedAt: Date.now(),
          closedAt: 0,
          options: ['', '', '', '', ''],
          votes: [],
        },
        currentTime: 0,
        isMounted: false,
        domWidth: 0,
        interval: 0,
        search: '',
      }
      return object
    },
    beforeDestroy: function () {
      clearInterval(this.interval)
    },
    mounted: function () {
      this.$moment.locale(this.configuration.lang)
      this.currentTime = Date.now()
      this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
      this.refresh();

      this.interval = window.setInterval(() => {
        this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
        this.currentTime = Date.now()
        this.refresh();
      }, 1000)

      this.isMounted = true
    },
    computed: {
      filteredVotes: function (): Array<PollInterface | 'new'> {
        const votes: Array<'new' | PollInterface> = [
          'new', ...this.votes,
        ];
        if (this.search.trim().length === 0) return votes;
          return votes.filter((o) => {
            if (typeof o !== 'string') {
            const isSearchInKeyword = !isNil(o.title.match(new RegExp(this.search, 'ig')))
            const isOpened = o.isOpened === true
            return isSearchInKeyword || isOpened
            } else {
              return true // is new -> must return
            }
          })
      },
      itemsPerPage: function (): number {
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
      },
    },
    methods: {
      atLeastTwoOptions: function (): Boolean {
        let options = 0
        for (let i = 0; i < this.newVote.options.length; i++) {
          if (this.newVote.options[i].trim().length > 0) options++
        }
        return options >= 2
      },
      refresh: function () {
        this.socket.emit('generic::getAll', (err: string | null, data: PollInterface[]) =>  {
          if (err) {
            return console.error(err);
          }
          console.debug('Loaded', data);
          this.votes = data
        })
      },
      create: function () {
        this.newVote.openedAt = Date.now()
        this.newVote.isOpened = true
        delete this.newVote.closedAt

        this.socket.emit('polls::save', this.newVote, (err: string | null, data: PollInterface[]) => {
            if (err) return console.error(err)
            else {
              this.refresh();
              this.newVote = {
                id: uuid(),
                type: 'normal',
                title: '',
                isOpened: true,
                options: ['', '', '', '', ''],
                openedAt: Date.now(),
              }
            }
          })
      },
      copy: function (vid: string) {
        const vote = this.votes.find(o => typeof o !== 'string' && o.id === vid);
        if (typeof vote === 'object') {
          let newVote = cloneDeep(vote)
          newVote.id = uuid();

          for (let i = 0, length = newVote.options.length; i < 5 - length; i++) {
            newVote.options.push('')
          };

          this.newVote = newVote;
        }
      },
      stop: function (vid: string) {
        let vote = this.votes.find(o => typeof o !== 'string' && o.id === vid)
        if (typeof vote === 'object') {
          vote.isOpened = false;
          vote.closedAt = Date.now();
          this.socket.emit('polls::close', vote, (err: string | null) => {
            if (err) console.error(err)
          })
        }
      },
      totalVotes: function (vid: string) {
        let totalVotes = 0
        const votes = this.votes.find(o => o.id === vid);
        if (votes?.votes) {
          for (let i = 0, length = votes.votes.length; i < length; i++) {
            totalVotes += votes.votes[i].votes
          }
        }
        return totalVotes
      },
      activeTime: function (vid: string) {
        const vote = this.votes.find(o => typeof o !== 'string' && o.id === vid);
        if (typeof vote === 'object') {
          return this.currentTime - (new Date(vote.openedAt || Date.now())).getTime();
        } else {
          return 0;
        }
      },
      getPercentage: function (vid: string, index: number, toFixed: number) {
        let numOfVotes = 0
        const votes = this.votes.find(o => o.id === vid);
        if (votes?.votes) {
          for (let i = 0, length = votes.votes.length; i < length; i++) {
            if (votes.votes[i].option === index) numOfVotes += votes.votes[i].votes
          }
        }
        return Number((100 / this.totalVotes(vid)) * numOfVotes || 0).toFixed(toFixed || 0);
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