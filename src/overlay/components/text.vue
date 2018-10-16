<template>
<div v-html="text"></div>
</template>

<script>
  export default {
    props: ['token'],
    data: function () {
      return {
        socket: io('/overlays/text', {query: "token="+token}),
        text: ''
      }
    },
    created: function () {
      this.refresh()
      setInterval(() => this.refresh(), 5000)
    },
    methods: {
      urlParam: function (name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
          return null
        } else {
          return decodeURI(results[1]) || 0;
        }
      },
      refresh: function () {
        if (this.urlParam('id')) {
          this.socket.emit('get', this.urlParam('id'), (cb) => {
            this.text = cb
          })
        } else {
          console.error('Missing id param in url')
        }
      }
    }
  }
</script>
