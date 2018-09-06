## Overlays
`!alert type=<image|audio|video|text|clip|html> duration=<default:1000> time=<default:1000> delay=<default:0> position=<default:center> volume=<default:100> x-offset=<default:0> y-offset=<default:0> size=<default:not-set> filters=<default:not-set> class=<default:not-set> text=<default:not-set> id=<default:not-set> url=<default:not-set>`
  - type - image, audio, video, text, html
  - duration - how long should be fadeIn animation in ms (default: 1000)
  - time - when should disappear in ms (default: 1000)
  - delay - delay of show/play in ms (default: 0)
  - position - top (or top-center), top-left, top-right, left, center, right, bottom (or bottom-center), bottom-left, bottom-right (default: center)
  - volume - set audio/video volume 0-100 (default: 100) - clip is always muted
  - x-offset - move image or video horizontally
  - y-offset - move image or video vertically
  - size - change size of video (only) in pixels
  - filters(video) - grayscale, sepia, tint, washed
  - class - set css class of object
  - text(text) - need to be in simple quotation marks, example: `text='Lorem Ipsum'`
  - id - specify id of a clip
  - url - specify url of a clip or html page

`!alert` can be also chainable with more than one type

**Example:**
`!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 duration=250 time=750 position=bottom-right | type=audio url=https://www.myinstants.com/media/sounds/the-simpsons-nelsons-haha.mp3`