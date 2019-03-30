<template>
<div>
  <canvas id='canvas' ref="canvas" width='800' height='600'>
    Canvas not supported, use another browser.
  </canvas>
  <i id="pointer" ref="pointer">
    <font-awesome-icon icon="sort-down" />
  </i>
</div>
</template>

<script>
import Winwheel from 'winwheel'
import io from 'socket.io-client';

import { TweenLite } from 'gsap/TweenMax'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSortDown } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faSortDown)

export default {
  props: ['token'],
  components: {
    'font-awesome-icon': FontAwesomeIcon
  },
  data: function () {
    return {
      socket: io('/games/wheeloffortune', {query: "token="+token}),
      username: null,
      theWheel: null
    }
  },
  created: function () {
    this.socket.on('spin', opts => {
      this.username = opts.username
      let segments = new Array()
      for (let option of opts.options) {
        segments.push({'fillStyle': this.getRandomColor(), 'text': option.title})
      }

      TweenLite.to(this.$refs["pointer"], 1.5, { opacity: 1 })
      TweenLite.to(this.$refs["canvas"], 1.5, { opacity: 1 })

      this.theWheel = new Winwheel({
        'numSegments'  : opts.options.length, // Number of segments
        'outerRadius'  : 212,                 // The size of the wheel.
        'centerX'      : 217,                 // Used to position on the background correctly.
        'centerY'      : 219,
        'textFontSize' : 28,                  // Font size.
        'segments'     : segments,
        'animation'    :                      // Definition of the animation
        {
          'type'     : 'spinToStop',
          'duration' : 5,
          'spins'    : 3,
          'easing'   : 'Back.easeOut.config(4)'
        }
      });
      this.theWheel.startAnimation()

      setTimeout(() => this.finished(), 6000)
    })
  },
  methods: {
    getRandomColor: function () {
      var letters = '0123456789ABCDEF'
      var color = '#'
      for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
      }
      return color
    },
    finished: function () {
      let winningSegmentNumber = this.theWheel.getIndicatedSegmentNumber()
      // Loop and set fillStyle of all segments to gray.
      for (var x = 1; x < this.theWheel.segments.length; x ++)
      {
          this.theWheel.segments[x].fillStyle = 'gray';
      }

      // Make the winning one yellow.
      this.theWheel.segments[winningSegmentNumber].fillStyle = 'yellow';

      // Call draw function to render changes.
      this.theWheel.draw();

      setTimeout(() => {
        this.socket.emit('win', winningSegmentNumber - 1, this.username)
        TweenLite.to(this.$refs["pointer"], 1.5, { opacity: 0 })
        TweenLite.to(this.$refs["canvas"], 1.5, { opacity: 0 })
      }, 1000)
    }
  }
}
</script>

<style scoped>
    #pointer {
    position: absolute;
    left: 206px;
    top: -30px;
    z-index: 999;
    font-size:60px;
    color:white;
    text-shadow: 0 0 3px rgb(0, 0, 0);
    opacity: 0;
    }
    #canvas { opacity: 0; }
</style>
