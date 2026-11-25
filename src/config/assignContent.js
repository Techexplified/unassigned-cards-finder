// Configuration and copy for Assign Members Dialog
export const assignContent = {
  // Deterministic pastel color palette for initials circles
  avatarPalette: [
    { bg: '#E5D9F8', text: '#5B2BB5' }, // Lavender / Purple
    { bg: '#D4F4E2', text: '#15803D' }, // Mint / Green
    { bg: '#FDE7CF', text: '#B45309' }, // Amber / Orange
    { bg: '#D8EFFB', text: '#0369A1' }, // Sky / Blue
    { bg: '#FCE2ED', text: '#BE185D' }, // Rose / Pink
    { bg: '#FDF2D0', text: '#854D0E' }, // Honey / Yellow
  ],

  copy: {
    pick: {
      title: 'Assign Members',
      subtext: 'Assign the selected {count} card{s} to a member.',
      labelAssignTo: 'Assign to',
      searchPlaceholder: 'Search or choose a member...',
      summaryCardsSelected: '{count} card{s} selected',
      summaryCardsFrom: 'Cards from: {lists}',
      btnCancel: 'Cancel',
      btnAssign: 'Assign to {count} Card{s}',
      emptyFilter: 'No members match',
      emptyBoard: 'No members on this board',
    },
    assigning: {
      label: 'Assigning {done} of {total}...',
    },
    success: {
      title: 'Members Assigned!',
      subtext: '{count} card{s} have been successfully assigned to',
      summaryHeader: 'Assignment Summary',
      statCardsAssigned: 'Cards Assigned',
      statListsUpdated: 'Lists Updated',
      statCompleted: 'Completed',
      btnViewUpdated: 'View Updated Cards',
      btnAssignMore: 'Assign More Cards',
    },
    partial: {
      title: 'Some cards could not be assigned',
      subtitle: '{succeeded} succeeded, {failed} failed.',
      btnRetry: 'Retry failed',
      btnClose: 'Close',
    },
    error: {
      title: 'Assignment Failed',
      defaultMessage: 'Unable to assign cards. Please check your permissions and try again.',
      btnRetry: 'Try again',
      btnCancel: 'Cancel',
    },
  },
};

/**
 * Returns a deterministic avatar color based on member ID string
 *
 * @param {string} memberId
 * @returns {{ bg: string, text: string }}
 */
export function getAvatarColor(memberId) {
  if (!memberId) return assignContent.avatarPalette[0];
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash << 5) - hash + memberId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % assignContent.avatarPalette.length;
  return assignContent.avatarPalette[index];
}
