
<template>
  <b-modal size="w-90" :title="translate('change-game')" no-fade v-model="show" ref="modalWindow">
    <div class="d-flex text-center" v-if="games.length > 0" @dragleave="dragleave" @dragenter="dragenter">
      <button class="btn btn-lg btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage--;" :disabled="carouselPage === 0">
        <font-awesome-icon icon="caret-left"></font-awesome-icon>
      </button>

      <div class="w-100 d-flex" style="flex-wrap: wrap;justify-content: center;">
        <img v-for="game of chunk(this.games, thumbnailsPerPage)[carouselPage]"
            draggable="true"
            style="margin-top: 0.55rem !important;"
            :style="{
              width: (90 / thumbnailsPerPage) + '%',
              'border-bottom': '0.3rem solid',
              'border-color': game !== currentGame ? 'transparent !important' : undefined
            }"
            @dragstart="dragstart(game)"
            @dragend="dragend(game)"
            class="m-1 border-warning"
            :key="game"
            :src="'https://static-cdn.jtvnw.net/ttv-boxart/' + encodeURIComponent(game) + '-100x140.jpg'"
            :title="game"
            @click="manuallySelected = true; currentGame = game"/>
        <div @dragleave="dragleave"
             class="m-1"
             style="width: 15%; height: 1px;pointer-events: none"
             v-for="index in (thumbnailsPerPage - chunk(this.games, thumbnailsPerPage)[carouselPage].length)" :key="index"></div>
      </div>

      <button class="btn btn-lg  btn-block btn-outline-dark border-0 p-3" style="width: fit-content;flex: max-content;" @click="carouselPage++;" :disabled="(carouselPage + 1) === chunk(this.games, 6).length">
        <font-awesome-icon icon="caret-right"></font-awesome-icon>
      </button>
    </div>
    <v-select :placeholder="translate('create-and-use-a-new-game')" class="form-control mt-2 mb-4" :options="searchForGameOpts" @search="searchForGame($event);" :searchable="true" @input="currentGame = $event"></v-select>

    <h5 class="modal-title">
      {{ translate('change-title') }} <small>{{ translate('for') }} {{ currentGame }}</small>
    </h5>
    <div v-for="(title, index) of titles" :key="index">
      <b-input-group @mousedown="selectedTitle = typeof title.id === 'undefined' ? (index === 0 ? 'current' : 'new') : title.id">
        <b-input-group-prepend is-text>
          <b-form-radio plain v-model="selectedTitle" name="selectedTitle" :value="typeof title.id === 'undefined' ? (index === 0 ? 'current' : 'new') : title.id"></b-form-radio>
        </b-input-group-prepend>
        <b-form-input :placeholder="['current', 'new'].includes(title.id) ? translate('create-and-use-a-new-title') : ''" v-if="title.id === 'new'" v-model="newTitle"></b-form-input>
        <b-form-input :placeholder="['current', 'new'].includes(title.id) ? translate('create-and-use-a-new-title') : ''" v-else v-model="title.title" :disabled="typeof title.id === 'undefined' && index === 0"></b-form-input>
        <button slot="append" v-if="!['current', 'new'].includes(title.id) && index !== 0" class="btn btn-danger" @click="deleteTitle(title.id)">
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
  import { chunk, debounce } from 'lodash-es'

  import { EventBus } from 'src/panel/helpers/event-bus';
  import { getSocket } from 'src/panel/helpers/socket';

  import { ModalPlugin } from 'bootstrap-vue';
  import vSelect from 'vue-select'
  import 'vue-select/dist/vue-select.css';

  Vue.use(ModalPlugin);
  Vue.component('v-select', vSelect)

  export default Vue.extend({
    data: function () {
      const object: {
        chunk: any;

        data: {
          game: string,
          title: string,
          id: string,
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
        currentTags: string[],
        cachedTags: {
          tag_id: string;
          locale: string;
          value: string;
        }[],

        saveState: -1 | 0 | 1 | 2;
        show: boolean;

        windowWidth: number;
        thumbnailsPerPage: number;

        socket: SocketIOClient.Socket;
      } = {
        chunk: chunk,
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

        windowWidth: 0,
        thumbnailsPerPage: 6,

        socket: getSocket('/'),
      }
      return object
    },
    watch: {
      windowWidth(width) {
        let thumbnailsPerPage;
        if (width < 304) {
          thumbnailsPerPage = 1;
        } else if (width < 393) {
          thumbnailsPerPage = 2;
        } else if (width < 481) {
          thumbnailsPerPage = 3;
        } else if (width < 570) {
          thumbnailsPerPage = 4;
        } else if (width < 700) {
          thumbnailsPerPage = 5;
        } else if (width < 800) {
          thumbnailsPerPage = 6;
        } else if (width < 900) {
          thumbnailsPerPage = 7;
        } else if (width < 1000) {
          thumbnailsPerPage = 8;
        } else if (width < 1100) {
          thumbnailsPerPage = 9;
        } else if (width < 1200) {
          thumbnailsPerPage = 10;
        } else if (width < 1300) {
          thumbnailsPerPage = 11;
        } else if (width < 1400) {
          thumbnailsPerPage = 12;
        } else if (width < 1500) {
          thumbnailsPerPage = 13;
        } else {
          thumbnailsPerPage = 14;
        }
        this.thumbnailsPerPage = thumbnailsPerPage;
      },
      show() {
        this.init()
      },
      currentGame() {
        this.selectedTitle = 'current';
      }
    },
    beforeDestroy() {
     window.removeEventListener('resize', this._resizeListener)
    },
    methods: {
      _resizeListener() {
        this.windowWidth = window.innerWidth;
      },
      deleteTitle(id: string) {
        this.data = this.data.filter(o => o.id !== id);
        this.selectedTitle = 'current';
      },
      init() {
        this.currentGame = null;
        this.manuallySelected = false;
        this.searchForTags(''); // buildup opts
        this.selectedTitle = 'current';
        this.newTitle = '';
        this.carouselPage = 0;
        this.socket.emit('getCachedTags', (data: {
          tag_id: string;
          locale: string;
          value: string;
          is_auto: boolean;
        }[]) => {
          this.cachedTags = data.filter(o => !o.is_auto);
        })
        this.socket.emit('getUserTwitchGames');

        this.socket.emit('panel.sendStreamData', (err: string | null, data: any) => {
          if (err) {
            return console.error(err);
          }
          console.groupCollapsed('changegamedialog::panel.sendStreamData')
          console.log(data)
          console.groupEnd();
          if (!this.currentGame) {
            this.currentGame = data.game;
            this.currentTitle = data.status;
            this.currentTags = data.tags.filter((o: any) => !o.is_auto).map((o: any) => {
              const key = Object.keys(o.localization_names).find(key => key.includes(this.configuration.lang))
              return o.localization_names[key || 'en-us'];
            })
          }
        });
      },
      handleOk() {
        let title = '';
        if (this.selectedTitle === 'current') {
          title = this.currentTitle
        } else if (this.selectedTitle === 'new') {
          title = this.newTitle
        } else {
          title = (this.data.find(o => o.id === this.selectedTitle) || { title: '' }).title
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
        }, (err: string | null) => {
          if (err) {
            this.saveState = -1;
          } else {
            this.saveState = 2;
            this.show = false;
            this.socket.emit('cleanupGameAndTitle', {
              game: this.currentGame,
              title,
              titles: this.data
            }, (err: string | null, data: any) => {
              this.data = data
            })
          }
          setTimeout(() => {
            this.saveState = 0;
          }, 1000);
        })
      },
      dragstart(game: string) {
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
      searchForGame(value: string) {
        if (value.trim().length !== 0) {
          this.socket.emit('getGameFromTwitch', value);
        } else {
          this.searchForGameOpts = [];
        }
      },
      searchForTags(value: string) {
        this.searchForTagsOpts = Array.from(new Set(this.cachedTags
          .map(o => o.value)
          .filter(o => {
            return o && o.toLowerCase().includes(value) && !this.currentTags.includes(o)
          }).sort((a, b) => {
            if (a < b)  { //sort string ascending
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0; //default return value (no sorting)
          })
        ));
      }
    },
    computed: {
      titles() {
        // first title is always current, last must be empty as new
        return [
          { game: (this as any).currentGame, title: (this as any).currentTitle },
          ...(this as any).data.filter((o: any) => o.game === (this as any).currentGame),
          { game: (this as any).currentGame, title: '', id: 'new' }
          ]
      },
      games() {
        if (this.manuallySelected) {
          return (this as any).cachedGamesOrder;
        } else if (this.currentGame) {
          (this as any).cachedGamesOrder = [
            ...new Set([
              (this as any).currentGame,
              ...(this as any).data.sort((a: any,b: any) => {
                if (typeof a.timestamp === 'undefined') { a.timestamp = 0; }
                if (typeof b.timestamp === 'undefined') { b.timestamp = 0; }
                if (a.timestamp > b.timestamp) {
                  return -1;
                } else if (a.timestamp < b.timestamp) {
                  return 1;
                } else {
                  return 0;
                }
              }).map((o: any) => o.game)
            ]
          )];
        } else {
          (this as any).cachedGamesOrder = [...new Set((this as any).data.sort((a: any,b: any) => {
            if (typeof a.timestamp === 'undefined') { a.timestamp = 0; }
            if (typeof b.timestamp === 'undefined') { b.timestamp = 0; }
            if (a.timestamp > b.timestamp) {
              return -1;
            } else if (a.timestamp < b.timestamp) {
              return 1;
            } else {
              return 0;
            }
          }).map((o: any) => o.game))];
        }
        return (this as any).cachedGamesOrder;
      }
    },
    created() {
      this.searchForGame = debounce(this.searchForGame, 500);
    },
    mounted() {
      this.windowWidth = window.innerWidth;
      window.addEventListener('resize', this._resizeListener);

      this.init();
      this.socket.on('sendGameFromTwitch', (data: any) => this.searchForGameOpts = data);
      this.socket.on('sendUserTwitchGamesAndTitles', (data: any) => { this.data = data });

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