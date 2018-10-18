<template>
  <div id="emotes"></div>
</template>

<script>
export default {
  props: ['token'],
  data: function () {
    return {
      socket: io('/overlays/emotes', {
        query: "token=" + token
      }),
      settings: {}
    }
  },
  created: function () {
    this.socket.emit('settings', (e, s) => this.settings = s)

    this.socket.on('emote.explode', (emotes) => this.explode(emotes))
    this.socket.on('emote', (emote_url) => this.show(emote_url))
  },
  methods: {
    show: function (emote_url) {
      console.log(emote_url)
      var left = _.random($('body').width() - 200) + 100
      var top = _.random($('body').height() - 200) + 100

      var emotes = $('#emotes')
      var img = $('<img></img>')
        .attr('src', emote_url)
        .css('top', top)
        .css('left', left)

      switch (this.settings.animation) {
        case 'facebook':
          left = _.random(200) + $('body').width() - 250
          top = $('body').height() + 20
          img = $('<img></img>')
            .attr('src', emote_url)
            .css('top', top)
            .css('left', left)
          setTimeout(function () {
            emotes.append(img)
            img.velocity({
                opacity: 0,
                top: top - _.random($('body').height() / 7, $('body').height() / 3),
                left: _.random(left - 60, left + 60)
              }, "easeOutSine", _.random(this.settings.animationTime - 500, this.settings.animationTime + 500),
              function () {
                $(this).remove()
              })
          }, _.random(2000))
          break
        case 'fadeup':
          setTimeout(function () {
            emotes.append(img)
            img.velocity({
                opacity: 0,
                top: top - 100
              }, this.settings.animationTime,
              function () {
                $(this).remove()
              })
          }, _.random(2000))
          break
        case 'fadezoom':
          setTimeout(function () {
            emotes.append(img)
            img.velocity({
                opacity: 0,
                scaleX: 0,
                scaleY: 0
              }, this.settings.animationTime,
              function () {
                $(this).remove()
              })
          }, _.random(2000))
          break
      }
    },
    explode: function (emotes_array) {
      console.log(emotes_array)
      var emotes = $('#emotes')
      for (var i = 0; i < 50; i++) {
        setTimeout(function () {
          var img = $('<img></img>')
            .attr('src', _.sample(emotes_array))
            .css('top', _.random(-300, 300) + $('#emotes').height() / 2)
            .css('left', _.random(-300, 300) + $('#emotes').width() / 2)
          emotes.append(img)
          img.velocity({
              opacity: 0,
              top: _.random(0, $('#emotes').height() - 100),
              left: _.random(0, $('#emotes').width() - 100)
            }, this.settings.animationTime,
            function () {
              $(this).remove()
            })
        }, _.random(3000))
      }
    }
  }
}
</script>
