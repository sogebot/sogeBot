declare namespace EventList {
  export interface Event {
    event: 'follow' | 'rewardredeem' | 'cheer' | 'subgift' | 'subcommunitygift' |  'resub' | 'sub' | 'raid' | 'tip';
    timestamp: number;
    userId: string;
    fromId?: string;
    isTest?: boolean;
    message?: string;
    amount?: number;
    titleOfReward?: string;
    rewardId?: string;
    currency?: string;
    months?: number;
    bits?: number;
    viewers?: number;
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
    charityCampaignName?: string;
  }
}