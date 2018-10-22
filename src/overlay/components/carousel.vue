<template>
<div>
</div>
</template>

<script>
</script>
<!doctype html>
<html lang="en">
  <head>
    <title>Carousel</title>
    <meta charset="utf-8">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#f4f5f6">
    <meta name="apple-mobile-web-app-status-bar-style" content="#f4f5f6">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link href="https://use.fontawesome.com/releases/v5.0.6/css/all.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Roboto+Condensed" rel="stylesheet">

    <script src="/socket.io/socket.io.js"></script>
    <script type="text/javascript" src="/auth/token.js"></script>

    <style>
      html, body {
        width: 99%;
        height: 99%;
        overflow: hidden;
      }
      img {
        width: 100%;
        opacity:0;
        position: absolute;
      }
    </style>
  </head>
  <body>
    <img src=''></img>

    <script src="/dist/jquery/js/jquery.min.js"></script>
    <script src="/dist/lodash/js/lodash.min.js"></script>
    <script src="/dist/velocity-animate/js/velocity.min.js"></script>

    <script>
      const socket = io('/overlays/carousel', { query: "token=" + token })
      const [PENDING, ACTIVE] = ['0', '1']

      var currentImage = -1
      var status = PENDING
      var images = []

      socket.emit('load', (cb) => {
        console.debug('Loaded images', cb)
        for (let image of cb) images[image.order] = image
      })

      function swapImages() {
        if (status === PENDING && images.length > 0) {
          status = ACTIVE
          currentImage++; if (_.isNil(images[currentImage])) currentImage = 0
          const image = images[currentImage]
          console.debug('showing', image)
          $('img').attr('src', `data:${image.type};base64, ${image.base64}`)
          // wait before
          setTimeout(() => {
            // revert any css changes
            $('img').css('filter', 'none')
            $('img').css('opacity', '0')
            $('img').css('top', '0')
            $('img').css('left', '0')
            $('img').css('display', 'inline')

            var animationIn
            switch (image.animationIn) {
              case 'blurIn':
                $('img').css('filter', 'blur(50px)')
                animationIn = { blur: 0, opacity: 1 }
                break
              case 'slideUp':
                $('img').css('opacity', '1')
                $('img').css('top', window.innerHeight + 'px')
                animationIn = { top: 0 }
                break
              case 'slideDown':
                $('img').css('opacity', '1')
                $('img').css('top', -$('img').innerHeight() + 'px')
                animationIn = { top: 0 }
                break
              case 'slideLeft':
                $('img').css('opacity', '1')
                $('img').css('left', window.innerWidth + 'px')
                animationIn = { left: 0 }
                break
              case 'slideRight':
                $('img').css('opacity', '1')
                $('img').css('left', -$('img').innerWidth() + 'px')
                animationIn = { left: 0 }
                break
              default:
                animationIn = image.animationIn
            }

            var animationOut
            switch (image.animationOut) {
              case 'blurOut':
                animationOut = { blur: 50, opacity: 0 }
                break
              case 'slideUp':
                $('img').css('opacity', '1')
                animationOut = { top: -$('img').innerHeight() }
                break
              case 'slideDown':
                $('img').css('opacity', '1')
                animationOut = { top: window.innerHeight + 'px' }
                break
              case 'slideLeft':
                $('img').css('opacity', '1')
                animationOut = { left: -$('img').innerWidth() }
                break
              case 'slideRight':
                $('img').css('opacity', '1')
                animationOut = { left: window.innerWidth + 'px' }
                break
              default:
                animationOut = image.animationOut
            }

            $('img')
              .velocity(animationIn, { duration: image.animationInDuration })
              .velocity(animationOut, {
                delay: image.duration,
                duration: image.animationOutDuration,
                complete: function() { setTimeout(() => status = PENDING, image.waitAfter) }})
          }, image.waitBefore)
        }
      }

      setInterval(swapImages, 10)

    </script>
  </body>
</html>
