// Configuration for scanning / progress screen
export const scanContent = {
  title: 'Scanning your board...',
  subtitle: 'Finding cards without assigned members.',
  steps: [
    {
      id: 'step-connect',
      stage: 'connect',
      label: 'Connect to board',
    },
    {
      id: 'step-scan',
      stage: 'scan',
      label: 'Scan cards',
    },
    {
      id: 'step-analyze',
      stage: 'analyze',
      label: 'Find unassigned cards',
    },
  ],
  timing: {
    completionHoldMs: 300,
  },
  error: {
    title: 'Scan failed',
    defaultMessage: 'Unable to scan your Trello board. Please check your permissions and try again.',
    retryLabel: 'Try again',
    backLabel: 'Back',
    errorMessages: {
      auth: 'Authorization expired. Please reconnect to Trello.',
      forbidden: 'You do not have permission to access this board.',
      not_found: 'The board was not found on Trello.',
      rate_limit: 'Trello API rate limit reached. Please wait a moment and try again.',
      server: 'Trello servers are currently experiencing issues. Please try again later.',
      network: 'Network connection error. Please check your connection and try again.',
      unknown: 'Unable to scan your Trello board. Please try again.',
    },
  },
};
