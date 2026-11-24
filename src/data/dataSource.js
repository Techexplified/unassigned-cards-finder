/**
 * Data contracts:
 *
 * Card contract:
 * @typedef {Object} Card
 * @property {string} id - Unique card ID
 * @property {string} name - Card title
 * @property {string} listName - Name of the list containing the card
 * @property {string} url - Trello card URL
 * @property {string[]} labels - List of label names or color tags
 * @property {string|null} due - ISO due date string or null
 *
 * Member contract:
 * @typedef {Object} Member
 * @property {string} id - Unique Trello member ID
 * @property {string} fullName - Full display name of the member
 * @property {string} username - Trello username
 * @property {string|null} avatarUrl - URL of member avatar or null
 */

/**
 * Initiates board scanning for cards without assigned members.
 * Currently a stub resolving after ~800ms.
 *
 * Real flow implementation steps:
 * // TODO: 1. Authorization:
 * //    Check `t.getRestApi().isAuthorized()`. If false, trigger authorization:
 * //    `await t.getRestApi().authorize({ scope: 'read,write', expiration: 'never' })`.
 * //    IMPORTANT: Must run directly inside the user click handler to prevent popup blocking.
 * //
 * // TODO: 2. Fetch Board Data:
 * //    Fetch board cards using Trello REST API:
 * //    GET /1/boards/{boardId}/cards?fields=id,name,idMembers,idList,url,due&labels=all&members=false
 * //    Fetch list names: GET /1/boards/{boardId}/lists?fields=id,name
 * //    Filter cards:
 * //      - idMembers is empty (length === 0)
 * //      - card is not closed (closed === false)
 * //
 * // TODO: 3. Navigation & Assignment:
 * //    Navigate to results screen (results.html) with discovered unassigned cards.
 * //    Support single/batch member assignment via PUT /1/cards/{id}/idMembers.
 *
 * @param {object|null} t - Trello Power-Up client instance (from TrelloPowerUp.iframe())
 * @returns {Promise<{ status: string, cards: Card[] }>}
 */
export async function startScan(t) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'ok',
        cards: [],
      });
    }, 800);
  });
}
