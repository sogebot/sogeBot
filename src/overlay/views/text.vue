<template>
<div v-html="text" id="main"></div>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { getSocket } from 'src/panel/helpers/socket';

@Component({})
export default class CarouselOverlay extends Vue {
  socket = getSocket('/registries/text', true);
  text = '';
  js: any = null;
  css: any = null;
  external = false;
  interval: any[] = [];

  beforeDestroy() {
    for(const interval of this.interval) {
      clearInterval(interval);
    }
  }

  mounted () {
    this.refresh()
    this.interval.push(setInterval(() => this.refresh(), 5000))
  }

  @Watch('css')
  cssWatch (css) {
    const head = document.getElementsByTagName('head')[0]
    const style = (document.createElement('style') as any)
    style.type = 'text/css';
    if (style.styleSheet){
      // This is required for IE8 and below.
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
  }

  @Watch('text')
  textWatch (val, old) {
    if (this.js) {
      console.group('onChange()')
      console.log(this.js)
      console.groupEnd()
      eval(val + ';if (typeof onChange === "function") { onChange(); }')
    }
  }

  @Watch('js')
  jsWatch (val) {
    console.group('onLoad()')
    console.log(val)
    console.groupEnd()
    eval(val + ';if (typeof onLoad === "function") { onLoad(); }')
  }

  refresh () {
    if (this.urlParam('id')) {
      this.socket.emit('text::getOne', this.urlParam('id'), (err, cb) => {
        if (err) {
          return console.error(err);
        }
        if (!cb) {
          return console.warn('No text overlay found with id ' + this.urlParam('id'));
        }
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
          this.text = cb.text
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
</script>