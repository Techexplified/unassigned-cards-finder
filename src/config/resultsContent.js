// Configuration for results screen
export const resultsContent = {
  // Config flag for board switching
  // TODO: Enable allowBoardSwitch and wire board selector dropdown when multi-board support lands
  allowBoardSwitch: false,

  copy: {
    unassignedSubtext: "Cards on this board that don't have any assigned members.",
    allSubtext: 'All open cards on this board.',
    assignButtonLabel: 'Assign Members',
    assignButtonTooltip: 'Select at least one card',
    searchPlaceholder: 'Search cards...',
    sortLabel: 'Sort by:',
    resetFilters: 'Reset Filters',
    emptyUnassigned: {
      title: 'Every card has an owner',
      subtitle: 'Great work! All open cards on this board have members assigned.',
    },
    emptyFilter: {
      title: 'No cards match your filters',
      subtitle: 'Try adjusting your search query or enabling more lists in the sidebar.',
      button: 'Reset Filters',
    },
    assignDialog: {
      title: 'Assign Members',
      message: 'Assigning members is the next screen.',
      selectedCountTemplate: 'Selected: {count} card{s}',
      closeLabel: 'Close',
    },
  },

  sortOptions: [
    { id: 'list-asc', label: 'List (A - Z)' },
    { id: 'list-desc', label: 'List (Z - A)' },
    { id: 'name-asc', label: 'Card name (A - Z)' },
    { id: 'name-desc', label: 'Card name (Z - A)' },
  ],

  // Label color mapping to styling classes
  labelColors: {
    green: 'chip-green',
    yellow: 'chip-yellow',
    orange: 'chip-orange',
    red: 'chip-red',
    purple: 'chip-purple',
    blue: 'chip-blue',
    sky: 'chip-sky',
    lime: 'chip-lime',
    pink: 'chip-pink',
    black: 'chip-black',
  },
};
