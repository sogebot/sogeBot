<template>
  <div class="container-fluid" ref="window">
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.howlongtobeat') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'howlongtobeat').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel cards></panel>

    <template v-for="(chunkGames, index) of chunk(games, itemsPerLine)">
      <div class="card-deck" v-bind:key="index">
        <template v-for="game of chunkGames">
          <div class="card mb-3 p-0 border" v-bind:key="String(game.game)">
            <div class="col p-0 text-center" style="{ max-height: 250px; background-color: black; }">
              <img class="max" :src="game.imageUrl" v-bind:key="String(game.game)"/>
              <h5 class="centered" style="text-transform: inherit;">{{ game.game }}</h5>
              <div class="btn-group w-100" role="group" aria-label="Basic example">
                <button @click="game.isFinishedMain = !game.isFinishedMain; update(game);" class="btn btn-sm" :class="{ 'btn-success': game.isFinishedMain, 'btn-danger': !game.isFinishedMain }">
                  <fa icon="check" fixed-width v-if="game.isFinishedMain"/>
                  <fa icon="ban" fixed-width v-else/>
                  Main
                  <small v-if="game.isFinishedMain">(done)</small>
                </button>

                <button @click="game.isFinishedCompletionist = !game.isFinishedCompletionist; update(game);"  class="btn btn-sm" :class="{ 'btn-success': game.isFinishedCompletionist, 'btn-danger': !game.isFinishedCompletionist }">
                  <fa icon="check" fixed-width v-if="game.isFinishedCompletionist"/>
                  <fa icon="ban" fixed-width v-else/>
                  Completionist
                  <small v-if="game.isFinishedCompletionist">(done)</small>
                </button>
              </div>
            </div>
            <div class="card-body col">
              <dl class="row">
                <dt class="col-6">Main</dt>
                <dd class="col-6">
                  <fa icon="spinner" spin v-if="!game.isFinishedMain" class="text-info" fixed-width/>
                  <fa icon="check" class="text-success" v-else fixed-width/>
                  {{ getHours(game.timeToBeatMain).toFixed(1) }}<small class="small">h</small> / {{ game.gameplayMain }}<small class="small">h</small>
                  <span class="percent">
                    {{ ((getHours(game.timeToBeatMain) / game.gameplayMain) * 100).toFixed(2) }}<small class="small">%</small>
                  </span>
                </dd>
                <dt class="col-6" v-if="game.gameplayCompletionist !== 0">Completionist</dt>
                <dd class="col-6" v-if="game.gameplayCompletionist !== 0">
                  <fa icon="spinner" spin v-if="!game.isFinishedCompletionist" class="text-info"/>
                  <fa icon="check" class="text-success" v-else/>
                  {{ getHours(game.timeToBeatCompletionist).toFixed(1) }}<small class="small">h</small> / {{ game.gameplayCompletionist }}<small class="small">h</small>
                  <span class="percent">
                    {{ ((getHours(game.timeToBeatCompletionist) / game.gameplayCompletionist) * 100).toFixed(2) }}<small class="small">%</small>
                  </span>
                </dd>
              </dl>
            </div>
          </div>
        </template>

        <!-- add empty cards -->
        <template v-if="chunkGames.length !== itemsPerLine">
          <div class="card" style="visibility: hidden" v-for="i in itemsPerLine - (chunkGames.length % itemsPerLine)" v-bind:key="i"></div>
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { chunk } from 'lodash-es';

  import moment from 'moment'
  import VueMoment from 'vue-moment'
  import momentTimezone from 'moment-timezone'

  require('moment/locale/cs')
  require('moment/locale/ru')

  import { getSocket } from '../../helpers/socket';
  import { HowLongToBeatGameInterface } from 'src/bot/database/entity/howLongToBeatGame';

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
        itemsPerLine: number,
        interval: number,
        games: HowLongToBeatGameInterface[],
        domWidth: number,
      } = {
        chunk: chunk,
        socket: getSocket('/systems/howlongtobeat'),
        games: [],
        itemsPerLine: 2,
        interval: 0,
        domWidth: 1080,
      }
      return object
    },
    beforeDestroy() {
      window.clearInterval(this.interval);
    },
    created() {
      this.interval = window.setInterval(() => {
        this.domWidth = (this.$refs['window'] as HTMLElement).clientWidth
      }, 100)
      this.socket.emit('generic::getAll::filter', { order: { startedAt: 'DESC' } }, (err: string | null, data: HowLongToBeatGameInterface[]) => {
        if (err) {
          return console.error(err);
        }
        this.games = data;
      })
    },
    watch: {
      domWidth(val) {
        if (val < 800) {
          this.itemsPerLine = 1
        } else if (val < 1200) {
          this.itemsPerLine = 2
        } else {
          this.itemsPerLine = 3
        }
      }
    },
    methods: {
      update(game: HowLongToBeatGameInterface) {
        this.socket.emit('hltb::save', game, () => {});
      },
      getHours(time: number): number {
        return Number(time / 1000 / 60 / 60)
      }
    }
  })
</script>

<style scoped>
.centered {
  position: absolute;
  left: 50%;
  top: 0%;
  transform: translate(-50%, 0%);
  padding: 0.5rem;
  margin: 0.2rem;
  background-color: rgba(0,0,0,0.5);
}

.percent {
  font-size: 1.4rem;
}
.small {
  font-size: 0.6rem;
}

img.max {
  max-height: 250px;
  max-width: inherit;
}
</style>