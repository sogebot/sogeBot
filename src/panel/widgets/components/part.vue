<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start)
          template(v-if="!popout")
            li(v-if="!nodrag").nav-item.px-2.grip.text-secondary.align-self-center
              fa(icon="grip-vertical" fixed-width)
            li.nav-item
              b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-part')" variant="outline-primary" toggle-class="border-0")
                b-dropdown-item
                  a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'part'))" class="text-danger")
                    | Remove <strong>{{translate('widget-title-part')}}</strong> widget
          template(v-else)
            b-button(variant="outline-primary" :disabled="true").border-0 {{ translate('widget-title-join') }}
        b-tab(active)
          template(v-slot:title)
            fa(icon="sign-out-alt" fixed-width)
          b-card-text.h-100
            | {{ list.map(o => o.username).join(', ') }}
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';
import { EventBus } from 'src/panel/helpers/event-bus';

import { chunk } from 'lodash-es';

@Component({
  props: {
    popout: Boolean,
    nodrag: Boolean,
  }
})
export default class App extends Vue {
  EventBus = EventBus;
  socket = getSocket('/widgets/joinpart');
  list: any[] = [];

  mounted() {
    this.$emit('mounted')
    this.socket.on('joinpart', (data: { users: string[], type: 'join' | 'part' }) => {
      if (data.type === 'part') {
        for (const [ index, username ] of Object.entries(data.users)) {
          if (!this.list.find(o => o.username === username)) {
            this.list.push({
              username, createdAt: Date.now() + Number(index)
            })
          }
        }
        this.list = chunk(this.list.sort((a, b) => {
          if (a.createdAt > b.createdAt) {
            return -1
          }
          if (a.createdAt < b.createdAt) {
            return 1
          }
          return 0
        }), 50)[0] || []
      }
    })
  }
}
</script>
