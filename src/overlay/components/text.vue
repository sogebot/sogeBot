<template>
<div v-html="text"></div>
</template>

<script>
  export default {
    props: ['token'],
    data: function () {
      return {
        socket: io('/overlays/text', {query: "token="+token}),
        base64string: window.location.search.replace('?', ''),
        text: ''
      }
    },
    created: function () {
      this.refresh()
      setInterval(() => this.refresh(), 5000)
    },
    methods: {
      refresh: function () {
        if (this.base64string.length !== 0) {
          this.socket.emit('parse.data', this.base64string, (cb) => {
            this.text = cb
          })
        } else {
          console.error('Missing base64 string in url')
        }
      }
    }
  }
</script>
