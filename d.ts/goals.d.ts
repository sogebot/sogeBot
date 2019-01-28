declare namespace Goals {
  type Group = {
    uid: string,
    createdAt: number,
    name: string,
    display: DisplayFade | DisplayMulti
  }

  type DisplayFade = {
    type: 'fade',
    durationMs: number,
    animationInMs: number,
    animationOutMs: number
  }

  type DisplayMulti = {
    type: 'multi',
    spaceBetweenGoalsInPx: number,
  }

  type BarOpts = {
    color: string,
    borderColor: string,
    borderPx: number,
    height: number
  }

  type FontOpts = {
    family: string,
    color: string,
    size: number,
    borderColor: string,
    borderPx: number,
  }

  type Goal = {
    uid: string,
    groupId: string,

    name: string,
    type: 'followers' | 'currentFollowers' | 'currentSubscribers' | 'subscribers' | 'tips' | 'bits',

    display: 'simple' | 'full' | 'custom'

    customization: {
      bar: BarOpts,
      font: FontOpts
      html: string,
      js: string,
      css: string,
    }

    timestamp: number,
    goalAmount: number,
    currentAmount: number,
    endAfter: string,
  }
}