<template>
<div v-html="text" id="main"></div>
</template>

<script>
  import io from 'socket.io-client';

  export default {
    props: ['token'],
    data: function () {
      return {
        socket: io('/overlays/text', {query: "token="+token}),
        text: '',
        js: null,
        css: null,
        external: false
      }
    },
    mounted: function () {
      this.refresh()
      setInterval(() => this.refresh(), 5000)
    },
    watch: {
      css: function (css) {
        const head = document.getElementsByTagName('head')[0]
        const style = document.createElement('style')
        style.type = 'text/css';
        if (style.styleSheet){
          // This is required for IE8 and below.
          style.styleSheet.cssText = css;
        } else {
          style.appendChild(document.createTextNode(css));
        }

        head.appendChild(style);
      },
      text: function (val, old) {
        if (this.js) {
          console.group('onChange()')
          console.log(this.js)
          console.groupEnd()
          eval(val + ';if (typeof onChange === "function") { onChange(); }')
        }
      },
      js: function (val) {
        console.group('onLoad()')
        console.log(val)
        console.groupEnd()
        eval(val + ';if (typeof onLoad === "function") { onLoad(); }')
      }
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
            if (!this.external) {
              if (cb.external) {
                for (let link of cb.external) {
                  var script = document.createElement('script')
                  script.src = link
                  document.getElementsByTagName('head')[0].appendChild(script)
                }
              }
              this.external = true
            }

            setTimeout(() => {
              this.text = cb.html
              this.$nextTick(() => {
                if (!this.js && cb.js) this.js = cb.js
                if (!this.css && cb.css) this.css = cb.css
              })
            }, 100)
          })
        } else {
          console.error('Missing id param in url')
        }
      }
    }
  }
</script>