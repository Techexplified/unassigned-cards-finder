// Static content configuration for landing screen
export const landingContent = {
  title: 'Find & Assign Unassigned Cards',
  subtitle: 'Scan your Trello board to find cards without assigned members and assign them in a few clicks.',
  features: [
    {
      id: 'scan-board',
      icon: 'search',
      title: 'Scan your board',
      description: 'Find cards with no members.',
    },
    {
      id: 'assign-members',
      icon: 'userPlus',
      title: 'Assign members',
      description: 'Assign one or multiple cards at once.',
    },
    {
      id: 'stay-on-top',
      icon: 'layers',
      title: 'Stay on top of work',
      description: 'Ensure every task has an owner.',
    },
  ],
  cta: {
    label: 'Scan Board',
  },
};
