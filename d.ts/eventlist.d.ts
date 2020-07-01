declare namespace EventList {
  export interface Event {
    event: string;
    timestamp: number;
    username: string;
    isTest?: boolean;
    autohost?: boolean;
    message?: string;
    amount?: number;
    currency?: string;
    months?: number;
    bits?: number;
    viewers?: number;
    from?: number;
    tier?: string;
    song_title?: string;
    song_url?: string;
    method?: string;
    subStreakShareEnabled?: boolean;
    subStreak?: number;
    subStreakName?: string;
    subCumulativeMonths?: number;
    subCumulativeMonthsName?: string;
    count?: number;
    monthsName?: string;
  }
}