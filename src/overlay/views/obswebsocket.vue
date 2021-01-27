<template>
  <div></div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from '@vue/composition-api'
import OBSWebSocket from 'obs-websocket-js';

import { getSocket } from 'src/panel/helpers/socket';
import { getCurrentIP } from 'src/panel/helpers/getCurrentIP'

type Props = {
  opts: {
    allowedIPs: string[],
  }
}

const socket = getSocket('/integrations/obswebsocket', true);

export default defineComponent({
  props: {
    opts: Object,
  },
  setup(props: Props, ctx) {
    onMounted(async () => {
      if (props.opts.allowedIPs.length > 0) {
        const currentIP = await getCurrentIP();
        if (props.opts.allowedIPs.includes(currentIP)) {
          console.log(`IP ${currentIP} have access to this OBSWebsocket overlay.`)
        } else {
          console.error(`IP ${currentIP} DON'T have access to this OBSWebsocket overlay.`)
          return;
        }
      } else {
          console.log(`There is no IP restrictions set.`)
      }

      const address: string = await new Promise((resolve, reject) => {
        socket.emit('get.value', 'address', (err: null | Error, val: string) => {
          if (err) {
            reject(err)
          } else {
            resolve(val)
          }
        })
      })
      const password: string = await new Promise((resolve, reject) => {
        socket.emit('get.value', 'password', (err: null | Error, val: string) => {
          if (err) {
            reject(err)
          } else {
            resolve(val)
          }
        })
      })
      const obs = new OBSWebSocket();
      if (password === '') {
        await obs.connect({ address });
      } else {
        await obs.connect({ address, password });
      }
      const scenes = await obs.send('ListSceneCollections')

      console.log({scenes});
    })
  }
});
</script>