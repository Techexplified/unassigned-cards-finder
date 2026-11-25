import { appConfig } from '../config/appConfig.js';
import * as stubSource from './stubSource.js';
import * as trelloSource from './trelloSource.js';

/**
 * DATA CONTRACT:
 *
 * Member = {
 *   id: string,
 *   fullName: string,
 *   username: string,
 *   initials: string
 * }
 *
 * ScanResult = {
 *   board: { id: string, name: string },
 *   lists: [{ id: string, name: string, pos: number }],
 *   cards: [{
 *     id: string,
 *     name: string,
 *     listId: string,
 *     shortUrl: string,
 *     labels: [{ id: string, name: string, color: string }],
 *     idMembers: string[],
 *     due: string | null,
 *     pos: number
 *   }],
 *   members: Member[],
 *   truncated: boolean
 * }
 *
 * Only open (non-archived) lists and cards.
 * "Unassigned" means idMembers.length === 0.
 */

/**
 * Determines whether to use the stub data source or the real Trello REST API source.
 * Stub source is picked when:
 * 1. t is unavailable (e.g. running outside Trello / local preview mode)
 * 2. URL search parameters contain ?stub=
 *
 * @param {any} t
 * @returns {typeof stubSource | typeof trelloSource}
 */
function getSource(t) {
  const isPreviewOrStub =
    !t ||
    typeof window === 'undefined' ||
    !window.location ||
    window.location.search.includes('stub=');

  if (isPreviewOrStub) {
    return stubSource;
  }

  // If real source is required, ensure Trello App Key is configured
  if (!appConfig.appKey || appConfig.appKey === 'your_key_here') {
    throw new Error('App key is not configured. Please set VITE_TRELLO_APP_KEY in your environment.');
  }

  return trelloSource;
}

export async function isAuthorized(t) {
  const source = getSource(t);
  return await source.isAuthorized(t);
}

export async function authorize(t) {
  const source = getSource(t);
  return await source.authorize(t);
}

export async function clearAuthorization(t) {
  const source = getSource(t);
  return await source.clearAuthorization(t);
}

export async function startScan(t, onProgress) {
  const source = getSource(t);
  return await source.startScan(t, onProgress);
}

export async function assignMembers(t, params, onProgress) {
  const source = getSource(t);
  return await source.assignMembers(t, params, onProgress);
}

export function openCard(t, cardId) {
  const source = getSource(t);
  return source.openCard(t, cardId);
}
