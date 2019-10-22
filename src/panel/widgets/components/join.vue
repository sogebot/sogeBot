<template lang="pug">
  div.widget
    b-card(no-body).border-0.h-100
      b-tabs(pills card style="overflow:hidden").h-100
        template(v-slot:tabs-start v-if="!popout")
          li(v-if="typeof nodrag === 'undefined'").nav-item.px-2.grip.text-secondary.align-self-center
            fa(icon="grip-vertical" fixed-width)
          li.nav-item
            b-dropdown(ref="dropdown" boundary="window" no-caret :text="translate('widget-title-join')" variant="outline-primary" toggle-class="border-0")
              b-dropdown-item
                a(href="#" @click.prevent="$refs.dropdown.hide(); $nextTick(() => EventBus.$emit('remove-widget', 'join'))" class="text-danger")
                  | Remove <strong>{{translate('widget-title-join')}}</strong> widget
        b-tab(active)
          template(v-slot:title)
            fa(icon="sign-in-alt" fixed-width)
          b-card-text.h-100
            | {{ joined }}
</template>

<script>
import { chunk } from 'lodash-es';
import { getSocket } from 'src/panel/helpers/socket';
import { EventBus } from 'src/panel/helpers/event-bus';
export default {
  props: ['popout', 'nodrag'],
  data: function () {
    return {
      EventBus,
      socket: getSocket('/widgets/joinpart'),
      list: []
    }
  },
  mounted: function () {
    this.$emit('mounted')
  },
  computed: {
    joined: function () {
      let list = chunk(this.list.filter(o => o.type === 'join').sort(o => -(new Date(o.createdAt).getTime())))[0]
      return list ? list.map(o => o.username).join(', ') : ''
    }
  },
  created: function () {
    this.socket.on('joinpart', (data) => {
      data.createdAt = new Date()
      this.list.push(data)
    })
  }
}
</script>
