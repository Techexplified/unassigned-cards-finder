/**
 * STUB DATA SOURCE FOR DEVELOPMENT AND PREVIEW
 *
 * Dev-only stub switches read from location.search:
 * ?stub=empty      (0 unassigned cards)
 * ?stub=error      (startScan rejects)
 * ?stub=slow       (slower progress)
 * ?stub=assignfail (causes some member assignments to fail for testing partial failure)
 * ?stub=unauth     (causes isAuthorized to return false initially)
 *
 * NOTE: Dev stub switch logic will be removed when the real Trello REST backend lands.
 */

function getDevStubMode() {
  if (typeof window === 'undefined' || !window.location || !window.location.search) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('stub');
}

let stubAuthorized = getDevStubMode() !== 'unauth';

export async function isAuthorized() {
  return stubAuthorized;
}

export async function authorize() {
  stubAuthorized = true;
  return true;
}

export async function clearAuthorization() {
  stubAuthorized = false;
}

/**
 * Realistic stub dataset:
 * Board: "Product Roadmap"
 * Lists: To Do, In Progress, Review, Done
 * 46 open cards total, of which 12 unassigned:
 * - To Do: 5 unassigned, 7 assigned (12 total)
 * - In Progress: 4 unassigned, 8 assigned (12 total)
 * - Review: 3 unassigned, 5 assigned (8 total)
 * - Done: 0 unassigned, 14 assigned (14 total)
 * Total cards: 46. Unassigned: 12.
 *
 * Members matching design screenshots:
 * - Aditi Sharma (AS)
 * - Rohan Kulkarni (RK)
 * - Meera Singh (MS)
 * - Vikram Rao (VR)
 */
function createStubDataset(stubMode) {
  const members = [
    { id: 'm-1', fullName: 'Aditi Sharma', username: 'aditisharma', initials: 'AS' },
    { id: 'm-2', fullName: 'Rohan Kulkarni', username: 'rohankulkarni', initials: 'RK' },
    { id: 'm-3', fullName: 'Meera Singh', username: 'meerasingh', initials: 'MS' },
    { id: 'm-4', fullName: 'Vikram Rao', username: 'vikramrao', initials: 'VR' },
  ];

  const lists = [
    { id: 'l-todo', name: 'To Do', pos: 1 },
    { id: 'l-inprogress', name: 'In Progress', pos: 2 },
    { id: 'l-review', name: 'Review', pos: 3 },
    { id: 'l-done', name: 'Done', pos: 4 },
  ];

  const cards = [
    // --- To Do: 5 unassigned, 7 assigned ---
    { id: 'c-1', name: 'Define Q4 product goals', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub1', labels: [{ id: 'lbl-plan', name: 'Planning', color: 'purple' }], idMembers: [], due: '2026-12-01', pos: 100 },
    { id: 'c-2', name: 'Create user research plan', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub2', labels: [{ id: 'lbl-res', name: 'Research', color: 'green' }], idMembers: [], due: null, pos: 200 },
    { id: 'c-3', name: 'Update product documentation', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub3', labels: [{ id: 'lbl-doc', name: 'Docs', color: 'blue' }], idMembers: [], due: '2026-11-30', pos: 300 },
    { id: 'c-4', name: 'Customer journey mapping', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub4', labels: [{ id: 'lbl-res2', name: 'Research', color: 'green' }], idMembers: [], due: null, pos: 400 },
    { id: 'c-5', name: 'Setup analytics tracking', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub5', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: [], due: null, pos: 500 },

    // To Do assigned cards (7)
    { id: 'c-6', name: 'Prioritize backlog items', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub6', labels: [{ id: 'lbl-plan', name: 'Planning', color: 'purple' }], idMembers: ['m-1'], due: null, pos: 600 },
    { id: 'c-7', name: 'Draft sprint release notes', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub7', labels: [{ id: 'lbl-doc', name: 'Docs', color: 'blue' }], idMembers: ['m-2'], due: null, pos: 700 },
    { id: 'c-8', name: 'Evaluate cloud cost optimization', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub8', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-3'], due: null, pos: 800 },
    { id: 'c-9', name: 'Competitor pricing analysis', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub9', labels: [{ id: 'lbl-res', name: 'Research', color: 'green' }], idMembers: ['m-1', 'm-4'], due: null, pos: 900 },
    { id: 'c-10', name: 'Security compliance review', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub10', labels: [{ id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: ['m-4'], due: null, pos: 1000 },
    { id: 'c-11', name: 'Weekly team sync prep', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub11', labels: [], idMembers: ['m-2'], due: null, pos: 1100 },
    { id: 'c-12', name: 'Prepare Q4 roadshow deck', listId: 'l-todo', shortUrl: 'https://trello.com/c/stub12', labels: [{ id: 'lbl-plan', name: 'Planning', color: 'purple' }], idMembers: ['m-1'], due: null, pos: 1200 },

    // --- In Progress: 4 unassigned, 8 assigned ---
    { id: 'c-13', name: 'Design onboarding flow', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub13', labels: [{ id: 'lbl-des', name: 'Design', color: 'pink' }], idMembers: [], due: '2026-12-05', pos: 100 },
    { id: 'c-14', name: 'Build API integration', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub14', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: [], due: null, pos: 200 },
    { id: 'c-15', name: 'Mobile responsive audit', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub15', labels: [{ id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: [], due: null, pos: 300 },
    { id: 'c-16', name: 'Refactor auth middleware', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub16', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: [], due: null, pos: 400 },

    // In Progress assigned cards (8)
    { id: 'c-17', name: 'Implement OAuth callback', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub17', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-3'], due: null, pos: 500 },
    { id: 'c-18', name: 'Dark mode design exploration', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub18', labels: [{ id: 'lbl-des', name: 'Design', color: 'pink' }], idMembers: ['m-2'], due: null, pos: 600 },
    { id: 'c-19', name: 'User interview transcriptions', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub19', labels: [{ id: 'lbl-res', name: 'Research', color: 'green' }], idMembers: ['m-2'], due: null, pos: 700 },
    { id: 'c-20', name: 'Upgrade database drivers', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub20', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-4'], due: null, pos: 800 },
    { id: 'c-21', name: 'Multi-tenant tenant isolation', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub21', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }, { id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: ['m-3', 'm-4'], due: null, pos: 900 },
    { id: 'c-22', name: 'Landing page copy revision', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub22', labels: [{ id: 'lbl-doc', name: 'Docs', color: 'blue' }], idMembers: ['m-1'], due: null, pos: 1000 },
    { id: 'c-23', name: 'Billing webhook retry logic', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub23', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-3'], due: null, pos: 1100 },
    { id: 'c-24', name: 'Design system icon audit', listId: 'l-inprogress', shortUrl: 'https://trello.com/c/stub24', labels: [{ id: 'lbl-des', name: 'Design', color: 'pink' }], idMembers: ['m-2'], due: null, pos: 1200 },

    // --- Review: 3 unassigned, 5 assigned ---
    { id: 'c-25', name: 'QA – Payment flow', listId: 'l-review', shortUrl: 'https://trello.com/c/stub25', labels: [{ id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: [], due: '2026-11-28', pos: 100 },
    { id: 'c-26', name: 'Review launch checklist', listId: 'l-review', shortUrl: 'https://trello.com/c/stub26', labels: [{ id: 'lbl-launch', name: 'Launch', color: 'purple' }], idMembers: [], due: '2026-11-29', pos: 200 },
    { id: 'c-27', name: 'Performance benchmark report', listId: 'l-review', shortUrl: 'https://trello.com/c/stub27', labels: [{ id: 'lbl-res', name: 'Research', color: 'green' }], idMembers: [], due: null, pos: 300 },

    // Review assigned cards (5)
    { id: 'c-28', name: 'Verify export to CSV format', listId: 'l-review', shortUrl: 'https://trello.com/c/stub28', labels: [{ id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: ['m-2'], due: null, pos: 400 },
    { id: 'c-29', name: 'GDPR consent flow copy review', listId: 'l-review', shortUrl: 'https://trello.com/c/stub29', labels: [{ id: 'lbl-doc', name: 'Docs', color: 'blue' }], idMembers: ['m-1'], due: null, pos: 500 },
    { id: 'c-30', name: 'Stripe webhook verification test', listId: 'l-review', shortUrl: 'https://trello.com/c/stub30', labels: [{ id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: ['m-3'], due: null, pos: 600 },
    { id: 'c-31', name: 'Design signoff for settings view', listId: 'l-review', shortUrl: 'https://trello.com/c/stub31', labels: [{ id: 'lbl-des', name: 'Design', color: 'pink' }, { id: 'lbl-plan', name: 'Planning', color: 'purple' }], idMembers: ['m-2'], due: null, pos: 700 },
    { id: 'c-32', name: 'Internal demo recording', listId: 'l-review', shortUrl: 'https://trello.com/c/stub32', labels: [{ id: 'lbl-launch', name: 'Launch', color: 'purple' }], idMembers: ['m-1'], due: null, pos: 800 },

    // --- Done: 0 unassigned, 14 assigned ---
    { id: 'c-33', name: 'Setup CI/CD pipeline', listId: 'l-done', shortUrl: 'https://trello.com/c/stub33', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-4'], due: null, pos: 100 },
    { id: 'c-34', name: 'Configure production DNS', listId: 'l-done', shortUrl: 'https://trello.com/c/stub34', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-4'], due: null, pos: 200 },
    { id: 'c-35', name: 'Initial customer interview series', listId: 'l-done', shortUrl: 'https://trello.com/c/stub35', labels: [{ id: 'lbl-res', name: 'Research', color: 'green' }], idMembers: ['m-2'], due: null, pos: 300 },
    { id: 'c-36', name: 'Create typography style guide', listId: 'l-done', shortUrl: 'https://trello.com/c/stub36', labels: [{ id: 'lbl-des', name: 'Design', color: 'pink' }], idMembers: ['m-2'], due: null, pos: 400 },
    { id: 'c-37', name: 'Draft API spec v1', listId: 'l-done', shortUrl: 'https://trello.com/c/stub37', labels: [{ id: 'lbl-doc', name: 'Docs', color: 'blue' }], idMembers: ['m-3'], due: null, pos: 500 },
    { id: 'c-38', name: 'Set up staging environment', listId: 'l-done', shortUrl: 'https://trello.com/c/stub38', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-4'], due: null, pos: 600 },
    { id: 'c-39', name: 'Audit accessibility colors', listId: 'l-done', shortUrl: 'https://trello.com/c/stub39', labels: [{ id: 'lbl-des', name: 'Design', color: 'pink' }, { id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: ['m-2'], due: null, pos: 700 },
    { id: 'c-40', name: 'Implement user password reset', listId: 'l-done', shortUrl: 'https://trello.com/c/stub40', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-3'], due: null, pos: 800 },
    { id: 'c-41', name: 'Write privacy policy draft', listId: 'l-done', shortUrl: 'https://trello.com/c/stub41', labels: [{ id: 'lbl-doc', name: 'Docs', color: 'blue' }], idMembers: ['m-1'], due: null, pos: 900 },
    { id: 'c-42', name: 'Define analytics event dictionary', listId: 'l-done', shortUrl: 'https://trello.com/c/stub42', labels: [{ id: 'lbl-plan', name: 'Planning', color: 'purple' }], idMembers: ['m-1'], due: null, pos: 1000 },
    { id: 'c-43', name: 'Conduct user feedback round 1', listId: 'l-done', shortUrl: 'https://trello.com/c/stub43', labels: [{ id: 'lbl-res', name: 'Research', color: 'green' }], idMembers: ['m-2'], due: null, pos: 1100 },
    { id: 'c-44', name: 'Setup error tracking with Sentry', listId: 'l-done', shortUrl: 'https://trello.com/c/stub44', labels: [{ id: 'lbl-dev', name: 'Development', color: 'yellow' }], idMembers: ['m-4'], due: null, pos: 1200 },
    { id: 'c-45', name: 'Beta test invitation email template', listId: 'l-done', shortUrl: 'https://trello.com/c/stub45', labels: [{ id: 'lbl-launch', name: 'Launch', color: 'purple' }], idMembers: ['m-1'], due: null, pos: 1300 },
    { id: 'c-46', name: 'Post-migration smoke testing', listId: 'l-done', shortUrl: 'https://trello.com/c/stub46', labels: [{ id: 'lbl-qa', name: 'QA', color: 'sky' }], idMembers: ['m-2'], due: null, pos: 1400 },
  ];

  // Dev switch: ?stub=empty -> assign fake members to all cards (0 unassigned)
  if (stubMode === 'empty') {
    cards.forEach((card) => {
      if (card.idMembers.length === 0) {
        card.idMembers = ['m-1'];
      }
    });
  }

  return {
    board: {
      id: 'b-1',
      name: 'Product Roadmap',
    },
    lists,
    cards,
    members,
    truncated: false,
  };
}

/**
 * Initiates board scanning for cards without assigned members using stub data.
 */
export async function startScan(t, onProgress = () => {}) {
  const stubMode = getDevStubMode();

  if (stubMode === 'error') {
    await new Promise((r) => setTimeout(r, 600));
    throw new Error('Connection refused: Unable to reach Trello API (stub=error test).');
  }

  const speedFactor = stubMode === 'slow' ? 2.5 : 1.0;

  const emit = (stage, percent) => {
    try {
      onProgress({ stage, percent });
    } catch (err) {
      console.error('Error in onProgress callback:', err);
    }
  };

  // Stage 1: Connect (0 to 25%)
  emit('connect', 5);
  await new Promise((r) => setTimeout(r, 200 * speedFactor));
  emit('connect', 15);
  await new Promise((r) => setTimeout(r, 250 * speedFactor));
  emit('connect', 25);
  await new Promise((r) => setTimeout(r, 200 * speedFactor));

  // Stage 2: Scan cards (25 to 85%)
  emit('scan', 35);
  await new Promise((r) => setTimeout(r, 300 * speedFactor));
  emit('scan', 52);
  await new Promise((r) => setTimeout(r, 350 * speedFactor));
  emit('scan', 72);
  await new Promise((r) => setTimeout(r, 350 * speedFactor));
  emit('scan', 85);
  await new Promise((r) => setTimeout(r, 250 * speedFactor));

  // Stage 3: Analyze unassigned cards (85 to 100%)
  emit('analyze', 92);
  await new Promise((r) => setTimeout(r, 300 * speedFactor));
  emit('analyze', 100);

  return createStubDataset(stubMode);
}

/**
 * Simulates member assignment across multiple cards.
 *
 * @param {any} t
 * @param {{ cardIds: string[], memberId: string }} params
 * @param {(progress: { done: number, total: number }) => void} onProgress
 * @returns {Promise<{ results: Array<{ cardId: string, ok: boolean, errorKind?: string, message?: string }> }>}
 */
export async function assignMembers(t, { cardIds = [], memberId }, onProgress = () => {}) {
  const stubMode = getDevStubMode();
  const results = [];
  const total = cardIds.length;

  for (let i = 0; i < total; i++) {
    const cardId = cardIds[i];
    await new Promise((r) => setTimeout(r, 200));

    // If ?stub=assignfail and this is the 2nd card, simulate a not_found failure
    if (stubMode === 'assignfail' && i === 1) {
      results.push({
        cardId,
        ok: false,
        errorKind: 'not_found',
        message: 'Card no longer available',
      });
    } else {
      results.push({
        cardId,
        ok: true,
      });
    }

    onProgress({ done: i + 1, total });
  }

  return { results };
}

export function openCard(t, cardId) {
  console.info(`[stubSource.openCard] Opening card ${cardId}`);
  if (t && typeof t.showCard === 'function') {
    t.showCard(cardId);
  }
}
