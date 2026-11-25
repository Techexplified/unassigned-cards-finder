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
  },
};
