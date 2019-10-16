
<template>
  <b-container fluid>
    <b-row>
      <b-col>
        <span class="title text-default mb-2">
          {{ translate('menu.manage') }}
          <small><fa icon="angle-right"/></small>
          {{ translate('menu.highlights') }}
        </span>
      </b-col>
      <b-col v-if="!$systems.find(o => o.name === 'highlights').enabled" style=" text-align: right;">
        <b-alert show variant="danger" style="padding: .5rem; margin: 0; display: inline-block;">
          <fa icon="exclamation-circle" fixed-width/> {{ translate('this-system-is-disabled') }}
        </b-alert>
      </b-col>
    </b-row>

    <panel search @search="search = $event"/>

    <loading v-if="state.loading !== $state.success"/>
    <template v-if="filtered.length > 0">
      <div :key="'highlight-' + index" class="card" v-for="(item, index) of filtered" v-bind:class="{ 'mt-3': index !== 0 }">
        <div class="card-body row p-0">
          <div class="col-sm-11 pr-0">
            <a class="btn btn-block btn-outline-dark border-0 h-100 text-left p-0" target="_blank" v-bind:href="'https://www.twitch.tv/videos/' + item.id + '?t=' + timestampToString(item.timestamp)">
              <img class="float-left pr-3" v-bind:src="generateThumbnail(item.game)">
              <div style="padding-top:0.8rem !important">
                {{ item.title }}
                <small class="d-block">
                  <fa :icon="[ 'far', 'clock' ]"></fa> {{ timestampToString(item.timestamp) }}
                  <i class="pl-2 far fa-calendar-alt"></i> {{ new Date(item.created_at).toLocaleString() }}
                  <i class="pl-2 fas fa-gamepad"></i> {{ item.game }}
                </small>
              </div>
            </a>
          </div>

          <div class="col-sm-1 pl-0">
            <button data-toggle="dropdown" class="btn btn-block btn-outline-dark border-0 h-100"><fa icon="ellipsis-v"></fa></button>
            <div class="dropdown-menu p-0">
              <button class="dropdown-item p-2 pl-4 pr-4" style="cursor: pointer" v-on:click="deleteItem(item._id)"><fa icon="trash-alt"></fa> {{ translate('delete') }}</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </b-container>
</template>

<script lang="ts">
import { getSocket } from 'src/panel/helpers/socket';
import { Vue, Component } from 'vue-property-decorator';
import { isNil } from 'lodash-es';

@Component({
  components: {
    loading: () => import('../../components/loading.vue'),
  },
})
export default class highlightsList extends Vue {
  socket = getSocket('/systems/highlights');
  items: any[] = [];
  search: string = '';
  state: {
    loading: number;
  } = {
    loading: this.$state.progress,
  }

  get filtered() {
    let items = this.items
    if (this.search.length > 0) {
      items = this.items.filter((o) => {
        return !isNil(o.title.match(new RegExp(this.search, 'ig'))) || !isNil(o.game.match(new RegExp(this.search, 'ig')))
      })
    }
    return items.sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
  }

  created() {
    this.state.loading = this.$state.progress;
    this.socket.emit('list', (err, items) => {
      this.items = items
      this.state.loading = this.$state.success;
    })
  }

  timestampToString(value) {
    const string = (value.hours ? `${value.hours}h` : '') +
      (value.minutes ? `${value.minutes}m` : '') +
      (value.seconds ? `${value.seconds}s` : '')
    return string
  }

  generateThumbnail(game) {
    const template = 'https://static-cdn.jtvnw.net/ttv-boxart/./%{game}-60x80.jpg'
    return template.replace('%{game}', encodeURI(game))
  }

  deleteItem(id) {
    this.socket.emit('delete', {_id: id}, () => {
      this.items = this.items.filter((o) => o._id !== id)
    })
  }
}
</script>
