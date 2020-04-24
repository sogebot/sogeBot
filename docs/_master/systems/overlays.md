## Text

`!alert type=text`

### Parameters

- **type**
  - For text alert you need to set it to `text`
  - **EXAMPLE:** `!alert type=text`
- **text**
  - Text to be shown in alert, **needs** to be in simple quotation marks `'`
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet'`

### Optional parameters

- **duration**
  - How long will be fadeIn and fadeOut animation
  - **Default value**: 1000
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet' duration=5000`
- **time**
  - How long will be alert seen in milliseconds
  - **Default value**: 5000
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet' time=1000`
- **delay**
  - How long will alert wait to be shown
  - **Default value**: 0
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet' delay=5000`
- **class**
  - Set custom class for styling in OBS, XSplit, etc.
  - **Default value**: *empty*
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet' class=myFancyClass`
- **x-offset**
  - Set X offset of text in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet' x-offset=100`
- **y-offset**
  - Set Y offset of text in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet' y-offset=100`
- **align**
  - Set align of text - left, center, right
  - **Default value**: left
  - **EXAMPLE:** `!alert type=text text='Lorem Ipsum Dolor Sit Amet' align=center`

## Image

`!alert type=image`

### Parameters

- **type**
  - For image alert you need to set it to `image`
  - **EXAMPLE:** `!alert type=image`
- **url**
  - URL of image to be shown in alert
  - **EXAMPLE:** `!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911`

### Optional parameters

- **duration**
  - How long will be fadeIn and fadeOut animation
  - **Default value**: 1000
  - **EXAMPLE:** `!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 duration=5000`
- **time**
  - How long will be alert seen in milliseconds
  - **Default value**: 5000
  - **EXAMPLE:** `!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 time=1000`
- **delay**
  - How long will alert wait to be shown
  - **Default value**: 0
  - **EXAMPLE:** `!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 delay=5000`
- **class**
  - Set custom class for styling in OBS, XSplit, etc.
  - **Default value**: *empty*
  - **EXAMPLE:** `!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 class=myFancyClass`
- **x-offset**
  - Set X offset of image in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 x-offset=100`
- **y-offset**
  - Set Y offset of image in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 y-offset=100`

## Audio

`!alert type=audio`

### Parameters

- **type**
  - For audio alert you need to set it to `audio`
  - **EXAMPLE:** `!alert type=audio`
- **url**
  - URL of audio to be shown in alert
  - **EXAMPLE:** `!alert type=audio url=https://www.myinstants.com/media/sounds/the-simpsons-nelsons-haha.mp3`

### Optional parameters

- **delay**
  - How long will alert wait to be played
  - **Default value**: 0
  - **EXAMPLE:** `!alert type=audio url=https://www.myinstants.com/media/sounds/the-simpsons-nelsons-haha.mp3 delay=5000`
- **volume**
  - Set volume of video in percent
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=audio url=https://www.myinstants.com/media/sounds/the-simpsons-nelsons-haha.mp3 volume=50`

## Video

`!alert type=video`

### Parameters

- **type**
  - For video alert you need to set it to `video`
  - **EXAMPLE:** `!alert type=video`
- **url**
  - URL of video to be shown in alert, only **mp4** videos are supported
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4`

### Optional parameters

- **size**
  - Set size of your video in px or %
  - **Default value**: 100%
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4 size=100px`
- **duration**
  - How long will be fadeIn and fadeOut animation
  - **Default value**: 1000
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4 duration=5000`
- **delay**
  - How long will alert wait to be played
  - **Default value**: 0
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4 delay=5000`
- **class**
  - Set custom class for styling in OBS, XSplit, etc.
  - **Default value**: *empty*
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4 class=myFancyClass`
- **x-offset**
  - Set X offset of video in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4 x-offset=100`
- **y-offset**
  - Set Y offset of video in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4 y-offset=100`
- **volume**
  - Set volume of video in percent
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=video url=http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4 volume=50`

## Clip

`!alert type=clip`

### Parameters

- **type**
  - For clip alert you need to set it to `clip`
  - **EXAMPLE:** `!alert type=clip`
- **url** or **id**
  - URL or ID of clip to be shown
  - **EXAMPLE (url):** `!alert type=clip url=https://clips.twitch.tv/JollyDeliciousLyrebirdYee`
  - **EXAMPLE (id):** `!alert type=clip id=JollyDeliciousLyrebirdYee`

### Optional parameters

- **duration**
  - How long will be fadeIn and fadeOut animation
  - **Default value**: 1000
  - **EXAMPLE:** `!alert type=clip id=JollyDeliciousLyrebirdYee duration=5000`
- **delay**
  - How long will alert wait to be played
  - **Default value**: 0
  - **EXAMPLE:** `!alert type=clip id=JollyDeliciousLyrebirdYee delay=5000`
- **class**
  - Set custom class for styling in OBS, XSplit, etc.
  - **Default value**: *empty*
  - **EXAMPLE:** `!alert type=clip id=JollyDeliciousLyrebirdYee class=myFancyClass`
- **x-offset**
  - Set X offset of clip in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=clip id=JollyDeliciousLyrebirdYee x-offset=100`
- **y-offset**
  - Set Y offset of clip in pixels
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=clip id=JollyDeliciousLyrebirdYee y-offset=100`
- **volume**
  - Set volume of video in percent
  - **Default value**: *not set*
  - **EXAMPLE:** `!alert type=clip id=JollyDeliciousLyrebirdYee volume=50`

## Iframe

`!alert type=html`

### Parameters

- **type**
  - For iframe alert you need to set it to `html`
  - **EXAMPLE:** `!alert type=html`
- **url**
  - URL of page you wnat to show
  - **EXAMPLE:** `!alert type=html url=http://sogebot.sogebot.xyz/custom/alert?type=sub&username=someUsername`
- **time**
  - How long will be page shown
  - **Default value**: 1000
  - **EXAMPLE:** `!alert type=html url=http://sogebot.sogebot.xyz/custom/alert?type=sub&username=someUsername time=5000`

### Optional parameters

- **duration**
  - How long will be fadeIn and fadeOut animation
  - **Default value**: 1000
  - **EXAMPLE:** `!alert type=html url=http://sogebot.sogebot.xyz/custom/alert?type=sub&username=someUsername duration=5000`
- **delay**
  - How long will alert wait to be played
  - **Default value**: 0
  - **EXAMPLE:** `!alert type=html url=http://sogebot.sogebot.xyz/custom/alert?type=sub&username=someUsername delay=5000`

## Alerts chaining

Is possible to send several alerts in one command (like image + audio)

!> Twitch TMI chat have 500 character limitation, over this limit !alert will be ignored


### Example

```chat
!alert type=image url=https://vignette3.wikia.nocookie.net/nonciclopedia/images/c/c5/Nelson_Muntz.png/revision/latest?cb=20100615074911 duration=250 time=750 | type=audio url=https://www.myinstants.com/media/sounds/the-simpsons-nelsons-haha.mp3
```