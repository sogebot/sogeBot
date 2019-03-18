<template>
<div class="card widget">
  <div class="card-header">
    <ul class="nav nav-pills" role="tablist">
      <li role="presentation" class="nav-item">
        <a class="nav-link active" href="#social-main" aria-controls="home" role="tab" data-toggle="tab" title="Social">
          <fa icon='share-square'/>
        </a>
      </li>
      <li role="presentation" class="nav-item">
        <a class="nav-link" href="#social-question" aria-controls="home" role="tab" data-toggle="tab" title="Social">
          <fa icon='question'/>
        </a>
      </li>
      <li role="presentation" class="nav-item widget-popout" v-if="!popout">
        <a class="nav-link" title="Popout" target="_blank" href="/popout/#social">
          <fa icon="external-link-alt" />
        </a>
      </li>
      <li class="nav-item ml-auto">
        <h6 class="widget-title" >{{commons.translate('widget-title-social')}}</h6>
      </li>
    </ul>
  </div>
  <!-- Tab panes -->
  <div class="card-body">
    <div class="tab-content">
      <div role="tabpanel" class="tab-pane active" id="social-main">
        <div class="list-group" v-if="state.loaded">
          <div v-for="(item, index) of items"
              :key="index"
              class="list-group-item"
              style="border-left: 0; border-right: 0; padding: 0.2rem 1.25rem 0.4rem 1.25rem">
            <strong>{{item.username}}</strong>
            <p class="mb-0">{{ item.text }}</p>
            <a :href="item.url" class="d-block text-right">
              <fa :icon="['fab', 'twitter']" v-if="item.type === 'twitter'"/>
              {{ item.timestamp | moment('LLL') }}
            </a>
          </div>
        </div>
        <table class="w-100 h-100 text-center" v-else>
          <tbody>
            <tr>
              <td class="align-middle"><fa icon="circle-notch" spin class="text-primary" size="3x" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- /MAIN -->

      <div role="tabpanel" class="tab-pane" id="social-question">
        <dl>
          <dt>Why is this widget empty?</dt>
          <dd>To fill social widget, you need to add tweet events with hashtags. Then all new posts will be added to this widget.</dd>
        </dl>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['commons', 'popout'],
  data: function () {
    const data: {
      items: Array<{}>,
      socket: any,
      state: { loaded: boolean },
      interval: number,
    } = {
      socket: io('/widgets/social', { query: "token=" + this.token }),
      items: [],
      state: {
        loaded: false,
      },
      interval: 0,
    }
    return data;
  },
  mounted: function () {
    this.$emit('mounted');
    this.load();
    this.interval = window.setInterval(() => {
      this.load();
    }, 10000)
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  methods: {
    load() {
      this.socket.emit('find', {}, (err, d) => {
        this.items = this._.chunk(this._.orderBy(d, 'timestamp', 'desc'), 50)[0];
        this.state.loaded = true;
      })
    }
  }
})
</script>
