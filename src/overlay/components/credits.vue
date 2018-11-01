<template>
<div>
  <pre class="debug" v-if="urlParam('debug')">
<button @click="stopAnimation">Stop Animation</button>
settings: {{ settings }}
currentPage: {{ currentPage }}
clipsPages: {{ clipsPages }}
isLoaded: {{ isLoaded }}
isPlaying: {{ isPlaying }}
isEnded: {{ isEnded }}
current: {{ current }}
  </pre>
  <div ref="page" class="page">
    <template v-for="(el, index) of current" v-show="!isEnded && !isPlaying">
      <video class="video" v-if="el.type === 'video'" playsinline ref="video" :key="el.clip">
        <source :src="el.clip" type="video/mp4">
      </video>
      <div v-else :class="el.class" :key="index" v-html="el.text"></div>
    </template>
  </div>
</div>
</template>

<script>
import { TweenLite, Power0 } from 'gsap/TweenMax'

export default {
  props: ['token'],
  data: function () {
    return {
      socket: io('/overlays/credits', {
        query: "token=" + token
      }),
      settings: {},
      pages: [],
      clipsPages: [],
      currentPage: 0,
      isLoaded: false,
      isPlaying: false,
      isEnded: false
    }
  },
  mounted: function () {
    this.socket.emit('load', (err, opts) => {
      this.settings = opts.settings

      // set speed
      if (opts.settings.speed === 'very slow') this.settings.speed = 50
      if (opts.settings.speed === 'slow') this.settings.speed = 25
      if (opts.settings.speed === 'medium') this.settings.speed = 15
      if (opts.settings.speed === 'fast') this.settings.speed = 5
      if (opts.settings.speed === 'very fast') this.settings.speed = 2

      // set page 1 -> title, game, text
      this.pages.push([
        {
          text: opts.game.value,
          class: "game"
        },
        {
          text: opts.title.value,
          class: "title"
        },
        {
          text: 'Stream by',
          class: "header3"
        },
        {
          text: opts.streamer,
          class: "streamer"
        }
      ])

      // TBD events
      let currentKey = ''
      let page = []
      for (let [key, object] of Object.entries(_.groupBy(opts.events, 'event'))) {
        if (key !== currentKey) {
          currentKey = key
          page.push({
            text: key,
            class: "header1"
          })
        }

        for (let o of object) {
          let html = o.username
          if (key === 'cheer') {
            html = `<strong style="font-size:65%">${o.bits} bits</strong> <br> ${o.username}`
          } else if (['raid', 'host'].includes(key)) {
            html = `<strong style="font-size:65%">${o.viewers} viewers</strong> <br> ${o.username}`
          } else if (['resub'].includes(key)) {
            html = `<strong style="font-size:65%">${o.months} months</strong> <br> ${o.username}`
          }
          page.push({
            text: html,
            class: "text4 column"
          })
        }
        for (let i = 0; i < 3 - (object.length % 3); i++) {
          page.push({
            text: '',
            class: "text4 column"
          })
        }
      }
      this.pages.push(page)

      // last pages are clips
      for (let i = 0, length = opts.clips.length; i < length; i++) {
        this.clipsPages.push(this.pages.length)

        const clip = opts.clips[i]
        this.pages.push([
          {
            text: clip.game,
            class: "clip_game"
          },
          {
            text: clip.title,
            class: "clip_title"
          },
          {
            text: clip.creator_name,
            class: "clip_createdBy"
          },
          {
            text: i + 1,
            class: "clip_index"
          },
          {
            clip: clip.mp4,
            class: "clip_video",
            type: "video"
          }
        ])
      }

      this.isLoaded = true
    })
  },
  computed: {
    current: function () {
      return this.pages[this.currentPage]
    }
  },
  watch: {
    isEnded: function (val) {
      if (val) {
        if (this.pages[this.currentPage + 1]) {
          this.$refs.page.style.top = window.innerHeight + 'px'
          this.isEnded = false
          this.isPlaying = false
          this.currentPage++
        }
      }
    },
    isLoaded: function () {
      setInterval(() => {
        if (!this.isPlaying) {
          if (this.$refs.page.clientHeight === 0) return
          this.$refs.page.style.top = window.innerHeight + 'px'

          this.$nextTick(() => { // force next tick
            this.isPlaying = true
            // normal linear if non clips
            if (!this.clipsPages.includes(this.currentPage)) {
              const duration = (window.innerHeight + this.$refs.page.clientHeight + 100) * this.settings.speed
              TweenLite.to(this.$refs.page, duration / 1000, {
                top: -(this.$refs.page.clientHeight + 100),
                ease: Power0.easeNone,
                onComplete: () => {
                  this.$refs.page.style.top != window.innerHeight + 'px'

                  this.$nextTick(() => {
                    this.isEnded = true
                  })
                }
              })
            } else {
              // clip page
              const duration1 = window.innerHeight * this.settings.speed
              const duration2 = (this.$refs.page.clientHeight + 100) * this.settings.speed
              TweenLite.to(this.$refs.page, duration1 / 1000, {
                top: 0,
                ease: Power0.easeNone,
                onComplete: () => {
                  // play clip
                  const video = this.$refs.video[0]
                  video.volume = this.settings.clips.volume / 100

                  if (this.settings.clips.shouldPlay) {
                    video.play()
                    video.onended = () => {
                      TweenLite.to(this.$refs.page, duration2 / 1000, {
                        top: -(this.$refs.page.clientHeight + 100),
                        ease: Power0.easeNone,
                        onComplete: () => {
                          this.isEnded = true
                          this.currentPage++
                        }
                      })
                    }
                  } else {
                    TweenLite.to(this.$refs.page, duration2 / 1000, {
                      top: -(this.$refs.page.clientHeight + 100),
                      ease: Power0.easeNone,
                      onComplete: () => {
                        this.isEnded = true
                        this.currentPage++
                      }
                    })
                  }
                }
              })
            }
          })
        }
      }, 10)
    }
  },
  methods: {
    stopAnimation: function () {
      TweenMax.killAll()
    },
    urlParam: function (name) {
      var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
      if (results == null) {
        return null
      } else {
        return decodeURI(results[1]) || 0;
      }
    }
  }
}
</script>

<style scoped>
  @import url('https://fonts.googleapis.com/css?family=Cabin+Condensed');

  .debug {
    z-index: 9999;
    background-color: rgba(0, 0, 0, 0.5);
    position: absolute;
    color: white;
    padding: 1rem;
  }

  div.page {
    font-family: 'Cabin Condensed', sans-serif;
    text-align: center;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 0 0 1rem #000;
    position: relative;
    top: -9999px;
    margin: 5vh;
    text-align: center;
  }

  .streamer {
    font-size: 2vw
  }

  .game {
    font-size: 4vw
  }

  .title {
    font-size: 2.5vw
  }

  .column {
    display: inline-block;
    width: 33%;
  }

  .text4 {
    padding-top: 2vw;
    font-size: 2vw;
  }

  .text3 {
    padding-top: 2vw;
    font-size: 2.5vw;
  }

  .text2 {
    padding-top: 2vw;
    font-size: 3vw;
  }

  .text1 {
    padding-top: 2vw;
    font-size: 3.5vw;
  }

  .header3 {
    padding-top: 2vw;
    font-size: 2.5vw;
    font-weight: bold;
  }

  .header2 {
    padding-top: 2vw;
    font-size: 3vw;
    font-weight: bold;
  }

  .header1 {
    padding-top: 2vw;
    font-size: 3.5vw;
    font-weight: bold;
  }

  .clip_title, .clip_game, .clip_createdBy {
    text-align: left;
    font-size: 3vw;
  }
  .clip_createdBy {
    font-size: 2.5vw
  }
  .clip_game {
    font-weight: bold;
  }
  .clip_index {
    font-size: 10vw;
    position: absolute;
    right: 2.5vw;
    top: 0;
  }
  .video {
    width: 100%;
    padding-top: 8vh;
    max-height: 65vh;
  }
</style>

<!--
    </head>
    <body>
      <div id='wrapper'>
        <div class='title'><span id="game"></span></div>
        <div class='subtitle'><span id="title"></span></div>

        <div class='job' id="stream-by"></div>
        <div class='name' id="streamer"></div>
        <div class="message"></div>

        <div id="events"></div>

        <div class='hosted-by' id="hosted-by"></div>
        <div class='hosted-column' id="hosts"></div>

        <div class='raided-by' id="raided-by"></div>
        <div class='raided-column' id="raids"></div>

        <div class="clips" id="clips"></div>

        <div class="custom" id="custom"></div>

        <div class="half-end"></div>
        <div class="end">
          <div class="center">
            <div class="last-message"><span id="last-message"></span></div>
            <div class="last-submessage"><span id="last-submessage"></span></div>

            <div id="social"></div>
          </div>
        </div>
      </div>

    <script src="/dist/jquery/js/jquery.min.js"></script>
    <script src="/dist/lodash/js/lodash.min.js"></script>
    <script src="/dist/velocity-animate/js/velocity.min.js"></script>

    <script>
      var resize = function (el, max, size, width) {
        if (size === max) return size
        width = width || 0
        size = size || 1
        $(el).css('font-size', (size + 1) + 'px')
        if ($(el).width() >= width) {
          return resize(el, max, size + 1, $(el).width())
        } else {
          $(el).css('font-size', (size - 1) + 'px')
        }
        return size
      }

      var socket = io('/overlays/credits', {query: "token="+token})

      socket.emit('custom.text.load', (err, cb) => { // load custom.text.load at first, then rest
        if (err) return console.error(err)
        cb = _.sortBy(cb, 'order')

        const $custom = $('#custom')
        for (let input of cb) {
          if (input.type === 'separator') $custom.append(`<div class="${input.type}"></div>`)
          else if (input.type === 'bigHeader') $custom.append(`<div class="${input.type}">${input.text.middle}</div>`)
          else {
            let columns = 0
            if (input.text.left.trim().length > 0) columns++
            if (input.text.middle.trim().length > 0) columns++
            if (input.text.right.trim().length > 0) columns++
            let width = 100 / columns
            $custom.append(`
              <div class="${input.type}" style="display: inline-flex; width: 100%; padding-left:5%; padding-right: 5%">
                <div style="width:${input.text.left.trim().length > 0 ? width : 0}%; text-align:left; display: inline-block;">${input.text.left}</div>
                <div style="width:${input.text.middle.trim().length > 0 ? width : 0}%; display: inline-block;">${input.text.middle}</div>
                <div style="width:${input.text.right.trim().length > 0 ? width : 0}%; text-align:right; display: inline-block;">${input.text.right}</div>
              </div>`)
          }
        }

        socket.emit('load', (err, events, streamer, game, title, hosts, raids, socials, messages, custom, speed, show, clips, maxFontSize, aggregate) => {
          $('#streamer').text(streamer)
          $('#game').text(game)
          $('#title').text(title)

          for (let [key, value] of Object.entries(messages)) {
            $('.hosted-by').text(`${_.get(custom, 'hosted-by', 'hosted by')}`)
            $('.raided-by').text(`${_.get(custom, 'raided-by', 'raided by')}`)
            if (key === 'lastMessage')  $('#last-message').html(value)
            else $('#last-submessage').html(value)
          }

          let size = resize('#game', maxFontSize)
          resize('#title', size - Math.floor((size / 4))) // title should be smaller than game
          size = resize('#last-message', maxFontSize)
          resize('#last-submessage', size - Math.floor((size / 4))) // submessage should be smaller than message

          let $events = $('#events')
          let $hosts = $('#hosts')
          let $raids = $('#raids')

          let followers = []
          let cheers = []
          let subs = []
          let tips = []
          for (let [index, event] of Object.entries(events)) {
            event.message = _.get(event, 'message', '')
            if (event.event === 'follow' && show.followers) {
              if (aggregate) followers.push({ username: event.username })
              else $events.append(`
                <div class='job'>${_.get(custom, 'followed-by', 'followed by')}</div>
                <div class='name'>${event.username}</div>
                <div class="message">${event.message}</div>
              `)
            } else if (event.event === 'cheer' && show.cheers) {
              if (aggregate) cheers.push({ username: event.username, bits: event.bits })
              else $events.append(`
                <div class='job'>${_.get(custom, 'cheer-by', 'cheer <strong>$bits bits</strong> by').replace('$bits', event.bits)}</div>
                <div class='name'>${event.username}</div>
                <div class="message">${event.message}</div>
              `)
            } else if (event.event === 'sub' && show.subscribers) {
              if (aggregate) subs.push({ username: event.username })
              else $events.append(`
                <div class='job'>${_.get(custom, 'subscribed-by', 'subscribed by')}</div>
                <div class='name'>${event.username}</div>
                <div class="message">${event.message}</div>
              `)
            } else if (event.event === 'resub' && show.resubs) {
              if (aggregate) subs.push({ username: event.username, months: event.months })
              else $events.append(`
                <div class='job'>${_.get(custom, 'resubscribed-by', 'resubscribed <strong>$months months</strong> by').replace('$months', event.months)}</div>
                <div class='name'>${event.username}</div>
                <div class="message">${event.message}</div>
              `)
            } else if (event.event === 'subgift' && show.subgifts) {
              if (aggregate) subs.push({ username: event.username })
              else $events.append(`
                <div class='job'>${_.get(custom, 'subgift-by', '<strong>$from</strong> gifted subscribe to').replace('$from', event.username)}</div>
                <div class='name'>${event.username}</div>
                <div class="message">${event.message}</div>
              `)
            } else if (event.event === 'subcommunitygift' && show.subcommunitygifts) {
              if (aggregate) subs.push({ username: event.username })
              else $events.append(`
                <div class='job'>${_.get(custom, 'subcommunitygift-by', '<strong>$from</strong> gifted subscribe to').replace('$from', event.username)}</div>
                <div class='name'>${event.count} viewers</div>
              `)
            } else if (event.event === 'tip' && show.tips) {
              if (aggregate) tips.push({ username: event.username, currency: event.currency, amount: event.amount })
              else $events.append(`
                <div class='job'>${_.get(custom, 'tip-by', 'tip <strong>$currency$amount</strong>').replace('$currency', event.currency).replace('$amount', parseFloat(event.amount).toFixed(2))}</div>
                <div class='name'>${event.username}</div>
                <div class="message">${event.message}</div>
              `)
            }
          }

          if (aggregate) {
            if (followers.length > 0) {
              let output = `
                  <div class='aggregated-by'>Follows</div>
                  <div class='aggregated-column'>
                  `
              for (let follow of followers) {
                output += `<div class='host-name'>${follow.username}</div>`
              }
              output += `</div>`
              $events.append(output)
            }
            if (cheers.length > 0) {
              let output = `
                  <div class='aggregated-by'>Cheers</div>
                  <div class='aggregated-column'>
                  `
              for (let cheer of _(cheers).groupBy('username').map((o, k) => ({ 'username': k, 'bits': _.sumBy(o, (o) => parseInt(o.bits, 10)) }))) {
                output += `<div class='host-name'>${cheer.username} - ${cheer.bits} bits</div>`
              }
              output += `</div>`
              $events.append(output)
            }
            if (subs.length > 0) {
              let output = `
                  <div class='aggregated-by'>Subs/Resubs</div>
                  <div class='aggregated-column'>
                  `
              for (let sub of subs) {
                output += `<div class='host-name'>${sub.months > 0 ? `${sub.months}x `: ``}${sub.username}</div>`
              }
              output += `</div>`
              $events.append(output)
            }
            if (tips.length > 0) {
              let output = `
                  <div class='aggregated-by'>Tips</div>
                  <div class='aggregated-column'>
                  `
              for (let tip of _(tips).groupBy('username').map((o, k) => ({ 'username': k, 'amount': Number.parseFloat(_.sumBy(o, 'amount')).toFixed(2), 'currency': _.find(tips, (b) => b.username === k).currency }))) {
                output += `<div class='host-name'>${tip.username} ${tip.currency}${tip.amount}</div>`
              }
              output += `</div>`
              $events.append(output)
            }
          }

          if (show.hosts) {
            for (let host of hosts) {
              $hosts.append(`<div class='host-name'>${host}</div>`)
            }
          }

          if (show.raids) {
            for (let raid of raids) {
              $raids.append(`<div class='host-name'>${raid}</div>`)
            }
          }

          socials = _.orderBy(socials, 'order')
          for (let social of socials) {
            $('#social').append(`
              <div class="social"><i class="fab fa-fw fa-${social.type}"></i> ${social.text}</div>
            `)
          }

          if ($hosts.text().length === 0) {
            $('.hosted-by').remove()
            $('.hosted-column').remove()
          }

          if ($raids.text().length === 0) {
            $('.raided-by').remove()
            $('.raided-column').remove()
          }
    </script>
    </body>
  </html>
*/
</script>
-->