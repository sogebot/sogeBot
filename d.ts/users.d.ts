declare type User = {
  id: string,
  username: string,
  is: {
    moderator: boolean,
    subscriber: boolean,
    follower: boolean,
  },
  lock: {
    followed_at?: boolean,
    subscribed_at?: boolean,
    follower?: boolean,
    subscriber?: boolean,
  }
  time: {
    follow?: number,
    created_at?: number,
    subscribed_at?: number,
  },
  stats: {
    tier?: 0 | 1 | 2 | 3,
    subStreak?: number,
    subCumulativeMonths?: number
  },
}

declare namespace User {
  type Tips = {
    id: string,
    amount: number,
    message: string,
    currency: string,
    timestamp: number,
  }

  type Bits = {
    id: string,
    amount: number,
    message: string,
    timestamp: number,
  }

  type Watched = {
    id: string,
    watched: number,
  }

  type Messages = {
    id: string,
    messages: number,
  }

  type Points = {
    id: string,
    points: number,
  }
}