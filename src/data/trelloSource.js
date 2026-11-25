import { appConfig } from '../config/appConfig.js';
import * as trelloApi from './trelloApi.js';

/**
 * Real Trello REST API Data Source Implementation
 */

export async function isAuthorized(t) {
  if (!t || !t.getRestApi || typeof t.getRestApi().isAuthorized !== 'function') {
    return false;
  }
  try {
    return await t.getRestApi().isAuthorized();
  } catch {
    return false;
  }
}

export async function authorize(t) {
  if (!t || !t.getRestApi || typeof t.getRestApi().authorize !== 'function') {
    throw new Error('Trello Power-Up context is not available.');
  }
  return await t.getRestApi().authorize({
    scope: appConfig.AUTH_SCOPE,
    expiration: appConfig.AUTH_EXPIRATION,
  });
}

export async function clearAuthorization(t) {
  if (t && t.getRestApi && typeof t.getRestApi().clearToken === 'function') {
    try {
      await t.getRestApi().clearToken();
    } catch (err) {
      console.warn('Failed to clear Trello token:', err);
    }
  }
}

/**
 * Scans a Trello board for cards without assigned members using the real REST API.
 * Emits progress across 3 stages: connect (0-25), scan (25-85), analyze (85-100).
 *
 * @param {any} t - Trello Power-Up client
 * @param {(progress: { stage: 'connect' | 'scan' | 'analyze', percent: number }) => void} onProgress
 * @returns {Promise<ScanResult>}
 */
export async function startScan(t, onProgress = () => {}) {
  // Stage 1: Connect (0 to 25%)
  onProgress({ stage: 'connect', percent: 5 });

  // 1. Verify token by requesting member info
  await trelloApi.request('/members/me', {
    params: { fields: 'id' },
    t,
  });
  onProgress({ stage: 'connect', percent: 15 });

  // 2. Fetch board context
  const board = await t.board('id', 'name');
  onProgress({ stage: 'connect', percent: 25 });

  // Stage 2: Scan cards (25 to 85%)
  // Run open lists, open cards, and board memberships in parallel
  const listsPromise = trelloApi
    .request(`/boards/${board.id}/lists`, {
      params: { filter: 'open', fields: 'name,pos' },
      t,
    })
    .then((lists) => {
      onProgress({ stage: 'scan', percent: 45 });
      return lists;
    });

  const cardsPromise = trelloApi
    .request(`/boards/${board.id}/cards`, {
      params: {
        filter: 'open',
        fields: 'name,idList,idMembers,labels,shortUrl,pos,due',
        limit: appConfig.MAX_CARDS,
      },
      t,
    })
    .then((cards) => {
      onProgress({ stage: 'scan', percent: 70 });
      return cards;
    });

  const membershipsPromise = trelloApi
    .request(`/boards/${board.id}/memberships`, {
      params: {
        member: 'true',
        member_fields: 'fullName,username,initials',
      },
      t,
    })
    .then((memberships) => {
      onProgress({ stage: 'scan', percent: 85 });
      return memberships;
    });

  const [rawLists, rawCards, rawMemberships] = await Promise.all([
    listsPromise,
    cardsPromise,
    membershipsPromise,
  ]);

  // Stage 3: Analyze unassigned cards (85 to 100%)
  onProgress({ stage: 'analyze', percent: 90 });

  const openListIdSet = new Set((rawLists || []).map((list) => list.id));

  // Drop cards whose idList is not an open list
  const validCards = (rawCards || [])
    .filter((card) => openListIdSet.has(card.idList))
    .map((card) => ({
      id: card.id,
      name: card.name || 'Untitled Card',
      listId: card.idList,
      shortUrl: card.shortUrl || `https://trello.com/c/${card.id}`,
      labels: (card.labels || []).map((lbl) => ({
        id: lbl.id,
        name: lbl.name || '',
        color: lbl.color || 'gray',
      })),
      idMembers: Array.isArray(card.idMembers) ? card.idMembers : [],
      due: card.due || null,
      pos: card.pos || 0,
    }));

  // Process board members:
  // Exclude 'observer' type and deactivated members; deduplicate by ID; sort alphabetically by fullName
  const memberMap = new Map();
  (rawMemberships || []).forEach((item) => {
    if (item.memberType !== 'observer' && !item.deactivated && item.member) {
      const m = item.member;
      const fullName = m.fullName || m.username || 'Unknown Member';
      const initials =
        m.initials ||
        (m.fullName
          ? m.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : '??');

      memberMap.set(m.id, {
        id: m.id,
        fullName,
        username: m.username || '',
        initials,
      });
    }
  });

  const members = Array.from(memberMap.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );

  // Check truncation:
  // TODO: Add cursor-based pagination if cards on board exceed MAX_CARDS (1000)
  const truncated = rawCards.length === appConfig.MAX_CARDS;

  onProgress({ stage: 'analyze', percent: 100 });

  return {
    board: {
      id: board.id,
      name: board.name || 'Trello Board',
    },
    lists: rawLists || [],
    cards: validCards,
    members,
    truncated,
  };
}

/**
 * Assigns a member to multiple cards with limited concurrency.
 * Never throws for single-card failures; collects and returns detailed results.
 *
 * @param {any} t - Trello Power-Up client
 * @param {{ cardIds: string[], memberId: string }} params
 * @param {(progress: { done: number, total: number }) => void} onProgress
 * @returns {Promise<{ results: Array<{ cardId: string, ok: boolean, errorKind?: string, message?: string }> }>}
 */
export async function assignMembers(t, { cardIds = [], memberId }, onProgress = () => {}) {
  const results = [];
  const total = cardIds.length;
  let doneCount = 0;

  // Process cards through an async concurrency pool
  const concurrency = appConfig.ASSIGN_CONCURRENCY;
  let index = 0;

  async function worker() {
    while (index < cardIds.length) {
      const currentIndex = index++;
      const cardId = cardIds[currentIndex];

      try {
        await trelloApi.request(`/cards/${cardId}/idMembers`, {
          method: 'POST',
          params: { value: memberId },
          t,
        });

        results[currentIndex] = { cardId, ok: true };
      } catch (err) {
        let message = err.message || 'Assignment failed';
        if (err.kind === 'not_found' || err.status === 404) {
          message = 'Card no longer available';
        }

        results[currentIndex] = {
          cardId,
          ok: false,
          errorKind: err.kind || 'unknown',
          message,
        };
      } finally {
        doneCount++;
        onProgress({ done: doneCount, total });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  return { results };
}

export function openCard(t, cardId) {
  if (t && typeof t.showCard === 'function') {
    t.showCard(cardId);
  }
}
