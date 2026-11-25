// Application configuration for Unassigned Card Finder
export const appConfig = {
  appKey: import.meta.env.TRELLO_APP_KEY || import.meta.env.VITE_TRELLO_APP_KEY,
  appName: 'Unassigned Card Finder',
  appAuthor: 'TODO', // TODO: Update with developer name or organization when publishing

  // Trello API and Authorization configurations
  API_BASE: 'https://api.trello.com/1',
  REQUEST_TIMEOUT_MS: 15000,
  ASSIGN_CONCURRENCY: 3,
  MAX_CARDS: 1000,
  AUTH_SCOPE: 'read,write',
  AUTH_EXPIRATION: 'never',
};
