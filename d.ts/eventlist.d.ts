declare namespace EventList {
  export interface Event {
    type: string;
    timestamp: number;
    username: string;
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
  }
}