/**
 * Pure selector functions (no DOM, no Trello calls)
 */

/**
 * Returns cards matching the current view mode ('unassigned' | 'all')
 *
 * @param {Object} scanResult
 * @param {'unassigned' | 'all'} view
 * @returns {Array<Object>}
 */
export function getViewCards(scanResult, view = 'unassigned') {
  if (!scanResult || !Array.isArray(scanResult.cards)) return [];
  if (view === 'unassigned') {
    return scanResult.cards.filter((card) => !card.idMembers || card.idMembers.length === 0);
  }
  return scanResult.cards;
}

/**
 * Calculates card counts per list for the given view mode ('unassigned' | 'all')
 *
 * @param {Object} scanResult
 * @param {'unassigned' | 'all'} view
 * @returns {Record<string, number>} listId -> count
 */
export function countsByList(scanResult, view = 'unassigned') {
  const counts = {};
  if (!scanResult || !Array.isArray(scanResult.lists)) return counts;

  // Initialize all lists to 0
  scanResult.lists.forEach((list) => {
    counts[list.id] = 0;
  });

  const cards = getViewCards(scanResult, view);
  cards.forEach((card) => {
    if (counts[card.listId] !== undefined) {
      counts[card.listId] += 1;
    } else {
      counts[card.listId] = 1;
    }
  });

  return counts;
}

/**
 * Filters a card array by selected list IDs and case-insensitive name query
 *
 * @param {Array<Object>} cards
 * @param {{ listIds?: Set<string> | Array<string>, query?: string }} filters
 * @returns {Array<Object>}
 */
export function applyFilters(cards, { listIds, query } = {}) {
  if (!Array.isArray(cards)) return [];

  const listIdSet = listIds instanceof Set ? listIds : new Set(listIds || []);
  const normalizedQuery = (query || '').trim().toLowerCase();

  return cards.filter((card) => {
    // List filter
    if (listIdSet.size > 0 && !listIdSet.has(card.listId)) {
      return false;
    }

    // Name substring query filter
    if (normalizedQuery && (!card.name || !card.name.toLowerCase().includes(normalizedQuery))) {
      return false;
    }

    return true;
  });
}

/**
 * Groups cards by list and applies group and card sorting.
 *
 * Sort modes:
 * - 'list-asc': Lists A-Z, cards kept in board pos order
 * - 'list-desc': Lists Z-A, cards kept in board pos order
 * - 'name-asc': Lists A-Z, cards sorted by name A-Z inside each group
 * - 'name-desc': Lists A-Z, cards sorted by name Z-A inside each group
 *
 * Groups with zero visible cards are excluded.
 *
 * @param {Array<Object>} cards
 * @param {Array<Object>} lists
 * @param {'list-asc' | 'list-desc' | 'name-asc' | 'name-desc'} sort
 * @returns {Array<{ list: Object, cards: Array<Object> }>}
 */
export function groupByList(cards, lists = [], sort = 'list-asc') {
  if (!Array.isArray(lists)) return [];

  // Map cards into list buckets
  const cardBuckets = new Map();
  lists.forEach((list) => cardBuckets.set(list.id, []));

  (cards || []).forEach((card) => {
    const bucket = cardBuckets.get(card.listId);
    if (bucket) {
      bucket.push(card);
    }
  });

  // Build groups for lists with visible cards
  const groups = [];
  lists.forEach((list) => {
    const listCards = cardBuckets.get(list.id) || [];
    if (listCards.length > 0) {
      groups.push({
        list,
        cards: [...listCards],
      });
    }
  });

  // Sort groups and cards within groups
  if (sort === 'list-desc') {
    groups.sort((a, b) => b.list.name.localeCompare(a.list.name));
    // Cards remain in board pos order
    groups.forEach((g) => g.cards.sort((a, b) => (a.pos || 0) - (b.pos || 0)));
  } else if (sort === 'name-asc') {
    groups.sort((a, b) => a.list.name.localeCompare(b.list.name));
    groups.forEach((g) => g.cards.sort((a, b) => a.name.localeCompare(b.name)));
  } else if (sort === 'name-desc') {
    groups.sort((a, b) => a.list.name.localeCompare(b.list.name));
    groups.forEach((g) => g.cards.sort((a, b) => b.name.localeCompare(a.name)));
  } else {
    // Default: 'list-asc'
    groups.sort((a, b) => a.list.name.localeCompare(b.list.name));
    groups.forEach((g) => g.cards.sort((a, b) => (a.pos || 0) - (b.pos || 0)));
  }

  return groups;
}

/**
 * Returns totals for unassigned cards and all open cards
 *
 * @param {Object} scanResult
 * @returns {{ unassigned: number, all: number }}
 */
export function totals(scanResult) {
  if (!scanResult || !Array.isArray(scanResult.cards)) {
    return { unassigned: 0, all: 0 };
  }

  const all = scanResult.cards.length;
  const unassigned = scanResult.cards.filter(
    (card) => !card.idMembers || card.idMembers.length === 0
  ).length;

  return { unassigned, all };
}
