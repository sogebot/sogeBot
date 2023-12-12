export const CONTENT_CLASSIFICATION_LABELS = {
  'MatureGame': {
    name: 'Mature-rated game', description: 'Games that are rated Mature or less suitable for a younger audience.',
  },
  'DrugsIntoxication': {
    name: 'Drugs, Intoxication, or Excessive Tobacco Use', description: 'Excessive tobacco glorification or promotion, any marijuana consumption/use, legal drug and alcohol induced intoxication, discussions of illegal drugs.',
  },
  'Gambling': {
    name: 'Gambling', description: 'Participating in online or in-person gambling, poker or fantasy sports, that involve the exchange of real money.',
  },
  'ProfanityVulgarity': {
    name: 'Significant Profanity or Vulgarity', description: 'Prolonged, and repeated use of obscenities, profanities, and vulgarities, especially as a regular part of speech.',
  },
  'SexualThemes': {
    name: 'Sexual Themes', description: 'Content that focuses on sexualized physical attributes and activities, sexual topics, or experiences.',
  },
  'ViolentGraphic': {
    name: 'Violent and Graphic Depictions', description: 'Simulations and/or depictions of realistic violence, gore, extreme injury, or death.',
  },
};

// PRIORITIES
export const MODERATION = -1;
export const HIGHEST = 0;
export const HIGH = 1;
export const MEDIUM = 2;
export const LOW = 3;
export const LOWEST = 4;

// Connection status
export const DISCONNECTED = 0;
export const CONNECTING = 1;
export const RECONNECTING = 2;
export const CONNECTED = 3;

// Time
export const SECOND = 1000;
export const MINUTE = 1000 * 60;
export const HOUR = 1000 * 60 * 60;
export const DAY = 1000 * 60 * 60 * 24;