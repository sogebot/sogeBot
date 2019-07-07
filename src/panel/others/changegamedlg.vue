
<template>
  <b-modal size="lg" :title="translate('change-game')" no-fade v-model="show">
    <div class="d-flex text-center" v-if="games.length > 0" @dragleave="dragleave" @dragenter="dragenter">
      <button class="btn btn-lg btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage--;" :disabled="carouselPage === 0">
        <font-awesome-icon icon="caret-left"></font-awesome-icon>
      </button>

      <div class="w-100 d-flex" style="flex-wrap: wrap;justify-content: center;">
        <img v-for="game of _.chunk(games, 6)[carouselPage]"
            draggable="true"
            style="width: 15%; margin-top: 0.55rem !important;"
            @dragstart="dragstart(game)"
            @dragend="dragend(game)"
            class="m-1 border-warning"
            :key="game"
            :src="'https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(game) + '-100x140.jpg'"
            :title="game"
            :style="{ 'border-bottom': '0.3rem solid', 'border-color': game !== currentGame ? 'transparent !important' : undefined }"
            @click="manuallySelected = true; currentGame = game"/>
        <div @dragleave="dragleave"
             class="m-1"
             style="width: 15%; height: 1px;pointer-events: none"
             v-for="index in (6 - _.chunk(games, 6)[carouselPage].length)" :key="index"></div>
      </div>

      <button class="btn btn-lg  btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage++;" :disabled="(carouselPage + 1) === _.chunk(games, 6).length">
        <font-awesome-icon icon="caret-right"></font-awesome-icon>
      </button>
    </div>
    <v-select :placeholder="translate('create-and-use-a-new-game')" class="form-control mt-2 mb-4" :options="searchForGameOpts" @search="searchForGame($event);" :searchable="true" @input="currentGame = $event"></v-select>

    <h5 class="modal-title">
      {{ translate('change-title') }} <small>{{ translate('for') }} {{ currentGame }}</small>
    </h5>
    <div v-for="(title, index) of titles" :key="index">
      <b-input-group @mousedown="selectedTitle = typeof title._id === 'undefined' ? (index === 0 ? 'current' : 'new') : title._id">
        <b-input-group-prepend is-text>
          <b-form-radio plain v-model="selectedTitle" name="selectedTitle" :value="typeof title._id === 'undefined' ? (index === 0 ? 'current' : 'new') : title._id"></b-form-radio>
        </b-input-group-prepend>
        <b-form-input :placeholder="['current', 'new'].includes(title._id) ? translate('create-and-use-a-new-title') : ''" v-if="title._id === 'new'" v-model="newTitle"></b-form-input>
        <b-form-input :placeholder="['current', 'new'].includes(title._id) ? translate('create-and-use-a-new-title') : ''" v-else v-model="title.title" :disabled="typeof title._id === 'undefined' && index === 0"></b-form-input>
        <button slot="append" v-if="!['current', 'new'].includes(title._id) && index !== 0" class="btn btn-danger" @click="deleteTitle(title._id)">
          <font-awesome-icon icon="trash"/>
        </button>
      </b-input-group>
    </div>

    <h5 class="modal-title mt-4">
      {{ translate('tags')}}
    </h5>
    <v-select :placeholder="translate('search-tags')" class="form-control mt-2 mb-4" :options="searchForTagsOpts" @search="searchForTags($event);" :searchable="true" @input="currentTags = $event; searchForTags('');" multiple :value="currentTags"></v-select>

    <div slot="modal-footer" class="w-100">
      <b-button
        v-if="saveState === -1"
        variant="danger"
        class="float-right"
      >{{ translate('dialog.buttons.something-went-wrong')}}</b-button>
      <b-button
        v-else-if="saveState === 0"
        variant="primary"
        class="float-right"
        @click="handleOk"
      >{{ translate('dialog.buttons.saveChanges.idle')}}</b-button>
      <b-button
        v-else-if="saveState === 1"
        :disabled="true"
        variant="primary"
        class="float-right"
      ><fa icon="spinner" spin/> {{ translate('dialog.buttons.saveChanges.progress')}}</b-button>
      <b-button
        v-else-if="saveState === 0"
        variant="success"
        class="float-right"
      >{{ translate('dialog.buttons.saveChanges.done')}}</b-button>

      <b-button
        variant="danger"
        class="float-right mr-2"
        @click="show=false"
      >{{ translate('close')}}</b-button>
    </div>
  </b-modal>
</template>

<script lang="ts">
  import Vue from 'vue'
  import io from 'socket.io-client';
  import _ from 'lodash';

  import { EventBus } from '../helpers/event-bus';

  import { ModalPlugin } from 'bootstrap-vue';
  import vSelect from 'vue-select'
  import 'vue-select/dist/vue-select.css';

  Vue.use(ModalPlugin);
  Vue.component('v-select', vSelect)

  export default Vue.extend({
    data: function () {
      const object: {
        socket: any,
        data: {
          game: string,
          title: string,
          _id: string,
        }[],
        currentGame: null | string,
        currentTitle: string,
        carouselPage: number,
        manuallySelected: boolean
        cachedGamesOrder: string[],
        searchForGameOpts: string[],
        searchForTagsOpts: string[],
        selectedTitle: any,
        newTitle: string,
        draggingGame: string | null,
        draggingEnter: number,
        draggingTimestamp: number,
        currentTags: any[],
        cachedTags: any[],

        saveState: -1 | 0 | 1 | 2;
        show: boolean;
      } = {
        socket: io('/', { query: "token=" + this.token }),
        data: [],
        currentGame: null,
        currentTitle: '',
        carouselPage: 0,
        manuallySelected: false,
        cachedGamesOrder: [],
        searchForGameOpts: [],
        searchForTagsOpts: [],
        selectedTitle: 'current',
        newTitle: '',
        draggingGame: null,
        draggingEnter: 0,
        draggingTimestamp: Date.now(),
        currentTags: [],
        cachedTags: [],

        saveState: 0,
        show: false,
      }
      return object
    },
    watch: {
      show() {
        this.init()
      },
      currentGame() {
        this.selectedTitle = 'current';
      }
    },
    methods: {
      deleteTitle(id) {
        this.data = this.data.filter(o => o._id !== id);
        this.selectedTitle = 'current';
      },
      init() {
        this.currentGame = null;
        this.manuallySelected = false;
        this.searchForTags(''); // buildup opts
        this.selectedTitle = 'current';
        this.newTitle = '';
        this.carouselPage = 0;
        this.socket.emit('getCachedTags', (data) => {
          this.cachedTags = data.filter(o => !o.is_auto);
        })
      },
      handleOk() {
        let title
        if (this.selectedTitle === 'current') {
          title = this.currentTitle
        } else if (this.selectedTitle === 'new') {
          title = this.newTitle
        } else {
          title = (this.data.find(o => String(o._id) === this.selectedTitle) || { title: '' }).title
        }
        console.debug('EMIT [updateGameAndTitle]', {
          game: this.currentGame,
          title,
          tags: this.currentTags,
        })
        this.saveState = 1
        this.socket.emit('updateGameAndTitle', {
          game: this.currentGame,
          title,
          tags: this.currentTags,
        }, (err) => {
          if (err) {
            this.saveState = -1;
          } else {
            this.saveState = 2;
            this.show = false;
            this.socket.emit('cleanupGameAndTitle', {
              game: this.currentGame,
              title,
              titles: this.data
            }, (err, data) => {
              this.data = data
            })
          }
          setTimeout(() => {
            this.saveState = 0;
          }, 1000);
        })
      },
      dragstart(game) {
        this.draggingEnter = 0;
        this.draggingGame = game;
      },
      dragleave() {
        this.draggingEnter--;
        this.draggingTimestamp = Date.now();
      },
      dragenter() {
        this.draggingEnter++;
      },
      dragend() {
        const timestamp = Date.now()
        this.$nextTick(() => {
          if (this.draggingEnter === 0 && this.draggingTimestamp - timestamp < -5) {
            this.data = this.data.filter(o => o.game !== this.draggingGame)
          }
          this.draggingGame = null;
        })
      },
      searchForGame(value) {
        if (value.trim().length !== 0) {
          this.socket.emit('getGameFromTwitch', value);
        } else {
          this.searchForGameOpts = [];
        }
      },
      searchForTags(value) {
        this.searchForTagsOpts = this.cachedTags.map(o => {
          const localization = Object.keys(o.localization_names).find(p => p.includes(this.configuration.lang))
          return o.localization_names[localization || 'en-us']
        }).filter(o => {
          return o.toLowerCase().includes(value) && !this.currentTags.includes(o)
        }).sort((a, b) => {
          if ((a || { name: ''}).name < (b || { name: ''}).name)  { //sort string ascending
            return -1;
          }
          if ((a || { name: ''}).name > (b || { name: ''}).name) {
            return 1;
          }
          return 0; //default return value (no sorting)
        });
      }
    },
    computed: {
      titles() {
        // first title is always current, last must be empty as new
        return [
          { game: (this as any).currentGame, title: (this as any).currentTitle },
          ...(this as any).data.filter(o => o.game === (this as any).currentGame),
          { game: (this as any).currentGame, title: '', _id: 'new' }
          ]
      },
      games() {
        if (this.manuallySelected) {
          return (this as any).cachedGamesOrder;
        } else if (this.currentGame) {
          (this as any).cachedGamesOrder = [
            ...new Set([
              (this as any).currentGame,
              ...(this as any).data.sort((a,b) => {
                if (a.timestamp < b.timestamp) {
                  return -1;
                } else if (a.timestamp > b.timestamp) {
                  return 1;
                } else {
                  return 0;
                }
              }).map(o => o.game)
            ]
          )];
        } else {
          (this as any).cachedGamesOrder = [...new Set((this as any).data.sort((a,b) => {
            if (a.timestamp < b.timestamp) {
              return -1;
            } else if (a.timestamp > b.timestamp) {
              return 1;
            } else {
              return 0;
            }
          }).map(o => o.game))];
        }
        return (this as any).cachedGamesOrder;
      }
    },
    created() {
      this.searchForGame = _.debounce(this.searchForGame, 500);
    },
    mounted() {
      this.init();
      this.socket.on('sendGameFromTwitch', (data) => this.searchForGameOpts = data);
      this.socket.on('sendUserTwitchGamesAndTitles', (data) => this.data = data);
      this.socket.on('stats', (data) => {
        if (!this.currentGame) {
          this.currentGame = data.game;
          this.currentTitle = data.status;
          this.currentTags = data.tags.filter(o => !o.is_auto).map(o => {
            const localization = Object.keys(o.localization_names).find(p => p.includes(this.configuration.lang))
            return o.localization_names[localization || 'en-us']
          });
        }
      });

      EventBus.$on('show-game_and_title_dlg', () => {
        this.init();
        this.show = true;
        this.socket.emit('getUserTwitchGames');
      });
    }
  })
</script>

<style scoped>
</style>