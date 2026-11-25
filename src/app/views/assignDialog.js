import { assignContent, getAvatarColor } from '../../config/assignContent.js';
import * as dataSource from '../../data/dataSource.js';
import { icons } from '../../ui/icons.js';

/**
 * Creates and manages the Assign Members Dialog state machine:
 * 'pick' | 'assigning' | 'success' | 'partial' | 'error'
 *
 * @param {{
 *   container: HTMLElement,
 *   t: any,
 *   store: any,
 *   triggerButton: HTMLElement,
 *   onSuccess: (params: { succeededCardIds: string[], member: any, action: 'more' | 'view' }) => void,
 *   onAuthError: (message: string) => void
 * }} params
 */
export function createAssignDialog({
  container,
  t,
  store,
  triggerButton,
  onSuccess,
  onAuthError,
}) {
  let dialogState = 'pick'; // 'pick' | 'assigning' | 'success' | 'partial' | 'error'
  let selectedMember = null;
  let memberSearchQuery = '';
  let isComboboxOpen = false;
  let activeOptionIndex = -1;
  let assignmentResults = null;
  let assigningProgress = { done: 0, total: 0 };
  let lastErrorMessage = '';
  let failedCardIds = [];

  // Dialog Overlay & Panel
  const overlay = document.createElement('div');
  overlay.className = 'assign-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'assignDialogTitle');
  overlay.style.display = 'none';

  const panel = document.createElement('div');
  panel.className = 'assign-dialog-panel';
  overlay.appendChild(panel);
  container.appendChild(overlay);

  function getSelectedCards() {
    const { scanResult, selectedCardIds } = store.getState();
    if (!scanResult || !selectedCardIds) return [];
    return scanResult.cards.filter((c) => selectedCardIds.has(c.id));
  }

  function getAssignableMembers() {
    const { scanResult } = store.getState();
    return scanResult?.members || [];
  }

  function getFilteredMembers() {
    const members = getAssignableMembers();
    const query = memberSearchQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(query) ||
        (m.username && m.username.toLowerCase().includes(query))
    );
  }

  /**
   * Computes list breakdown summary text:
   * e.g. "Cards from: To Do (2), In Progress (2)"
   */
  function computeListBreakdown(cards) {
    const { scanResult } = store.getState();
    if (!scanResult || !cards.length) return '';

    const listMap = new Map();
    scanResult.lists.forEach((l) => listMap.set(l.id, { name: l.name, count: 0 }));

    cards.forEach((c) => {
      if (listMap.has(c.listId)) {
        listMap.get(c.listId).count++;
      }
    });

    const nonZeroLists = [];
    scanResult.lists.forEach((l) => {
      const item = listMap.get(l.id);
      if (item && item.count > 0) {
        nonZeroLists.push(`${item.name} (${item.count})`);
      }
    });

    if (nonZeroLists.length <= 3) {
      return nonZeroLists.join(', ');
    }

    const first3 = nonZeroLists.slice(0, 3).join(', ');
    const remaining = nonZeroLists.length - 3;
    return `${first3}, +${remaining} more`;
  }

  function closeDialog() {
    overlay.style.display = 'none';
    dialogState = 'pick';
    selectedMember = null;
    memberSearchQuery = '';
    isComboboxOpen = false;
    activeOptionIndex = -1;
    assignmentResults = null;
    failedCardIds = [];
    store.setState({ dialogOpen: false });

    // Return focus to trigger button
    if (triggerButton && typeof triggerButton.focus === 'function') {
      triggerButton.focus();
    }
  }

  /**
   * Executes member assignment across selected cards
   *
   * @param {string[]} cardIdsToAssign
   */
  async function runAssignment(cardIdsToAssign) {
    if (!selectedMember || !cardIdsToAssign.length) return;

    dialogState = 'assigning';
    assigningProgress = { done: 0, total: cardIdsToAssign.length };
    render();

    try {
      const response = await dataSource.assignMembers(
        t,
        { cardIds: cardIdsToAssign, memberId: selectedMember.id },
        ({ done, total }) => {
          assigningProgress = { done, total };
          const progressEl = panel.querySelector('#assignProgressLabel');
          if (progressEl) {
            progressEl.textContent = assignContent.copy.assigning.label
              .replace('{done}', done.toString())
              .replace('{total}', total.toString());
          }
        }
      );

      assignmentResults = response.results || [];
      const succeeded = assignmentResults.filter((r) => r.ok).map((r) => r.cardId);
      const failed = assignmentResults.filter((r) => !r.ok);
      failedCardIds = failed.map((r) => r.cardId);

      // Check if auth error occurred
      const authErr = failed.find((r) => r.errorKind === 'auth');
      if (authErr) {
        closeDialog();
        if (typeof onAuthError === 'function') {
          onAuthError('Authorization expired. Please reconnect to Trello.');
        }
        return;
      }

      if (failed.length === 0) {
        dialogState = 'success';
      } else if (succeeded.length > 0) {
        dialogState = 'partial';
      } else {
        dialogState = 'error';
        lastErrorMessage = failed[0]?.message || assignContent.copy.error.defaultMessage;
      }

      render();
    } catch (err) {
      if (err.kind === 'auth') {
        closeDialog();
        if (typeof onAuthError === 'function') {
          onAuthError('Authorization expired. Please reconnect to Trello.');
        }
        return;
      }

      dialogState = 'error';
      lastErrorMessage = err.message || assignContent.copy.error.defaultMessage;
      render();
    }
  }

  function renderPickState() {
    const selectedCards = getSelectedCards();
    const count = selectedCards.length;
    const filteredMembers = getFilteredMembers();
    const listBreakdown = computeListBreakdown(selectedCards);

    panel.innerHTML = `
      <div class="assign-dialog-header">
        <div class="assign-dialog-title-row">
          <span class="assign-dialog-icon" aria-hidden="true">${icons.userPlus}</span>
          <h2 class="assign-dialog-title" id="assignDialogTitle">${assignContent.copy.pick.title}</h2>
        </div>
        <button type="button" class="btn-dialog-x" id="btnDialogX" aria-label="Close dialog">
          ${icons.close}
        </button>
      </div>

      <p class="assign-dialog-subtext">
        ${assignContent.copy.pick.subtext.replace('{count}', count.toString()).replace('{s}', count === 1 ? '' : 's')}
      </p>

      <div class="assign-combobox-section">
        <label for="memberComboboxInput" class="assign-combobox-label">${assignContent.copy.pick.labelAssignTo}</label>
        <div class="assign-combobox-wrapper" id="comboboxWrapper">
          <div class="combobox-input-box" id="comboboxInputBox" tabindex="0" role="combobox" aria-expanded="${isComboboxOpen}" aria-haspopup="listbox" aria-controls="memberListbox">
            <span class="combobox-left-icon" aria-hidden="true">${icons.user}</span>
            <div class="combobox-selected-view" id="comboboxSelectedView" style="${selectedMember ? 'display: flex;' : 'display: none;'}">
              <span class="member-avatar-circle" id="selectedMemberAvatar"></span>
              <span class="selected-member-name" id="selectedMemberName"></span>
              <button type="button" class="btn-clear-member" id="btnClearMember" aria-label="Clear selected member">&times;</button>
            </div>
            <input
              type="text"
              class="combobox-search-input"
              id="memberComboboxInput"
              placeholder="${assignContent.copy.pick.searchPlaceholder}"
              value="${memberSearchQuery}"
              autocomplete="off"
              style="${selectedMember ? 'display: none;' : 'display: block;'}"
              aria-autocomplete="list"
            />
            <span class="combobox-chevron" aria-hidden="true">${icons.chevronDown}</span>
          </div>

          <div
            class="combobox-dropdown"
            id="memberListbox"
            role="listbox"
            style="${isComboboxOpen ? 'display: block;' : 'display: none;'}"
            aria-label="Assignable board members"
          >
            <!-- Member options populated via JS -->
          </div>
        </div>
      </div>

      <div class="assign-summary-box">
        <div class="summary-box-icon" aria-hidden="true">${icons.layers}</div>
        <div class="summary-box-text">
          <div class="summary-count-line">
            ${assignContent.copy.pick.summaryCardsSelected.replace('{count}', count.toString()).replace('{s}', count === 1 ? '' : 's')}
          </div>
          <div class="summary-lists-line">
            ${assignContent.copy.pick.summaryCardsFrom.replace('{lists}', listBreakdown || 'None')}
          </div>
        </div>
      </div>

      <div class="assign-dialog-footer">
        <button type="button" class="btn-dialog-cancel" id="btnCancelPick">${assignContent.copy.pick.btnCancel}</button>
        <button
          type="button"
          class="btn-dialog-primary"
          id="btnSubmitAssign"
          ${!selectedMember ? 'disabled' : ''}
        >
          ${assignContent.copy.pick.btnAssign.replace('{count}', count.toString()).replace('{s}', count === 1 ? '' : 's')}
        </button>
      </div>
    `;

    // Elements
    const btnX = panel.querySelector('#btnDialogX');
    const btnCancel = panel.querySelector('#btnCancelPick');
    const btnSubmit = panel.querySelector('#btnSubmitAssign');
    const comboboxInput = panel.querySelector('#memberComboboxInput');
    const comboboxInputBox = panel.querySelector('#comboboxInputBox');
    const dropdown = panel.querySelector('#memberListbox');
    const btnClearMember = panel.querySelector('#btnClearMember');
    const selectedAvatar = panel.querySelector('#selectedMemberAvatar');
    const selectedName = panel.querySelector('#selectedMemberName');

    if (selectedMember) {
      const color = getAvatarColor(selectedMember.id);
      if (selectedAvatar) {
        selectedAvatar.style.backgroundColor = color.bg;
        selectedAvatar.style.color = color.text;
        selectedAvatar.textContent = selectedMember.initials;
      }
      if (selectedName) {
        selectedName.textContent = selectedMember.fullName;
      }
    }

    // Populate dropdown options
    if (dropdown) {
      dropdown.textContent = '';
      if (filteredMembers.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'combobox-empty-item';
        emptyDiv.textContent = getAssignableMembers().length === 0
          ? assignContent.copy.pick.emptyBoard
          : assignContent.copy.pick.emptyFilter;
        dropdown.appendChild(emptyDiv);
      } else {
        filteredMembers.forEach((member, idx) => {
          const opt = document.createElement('div');
          opt.className = 'combobox-option-item';
          opt.id = `member-opt-${member.id}`;
          opt.setAttribute('role', 'option');
          opt.setAttribute('aria-selected', (selectedMember?.id === member.id).toString());

          if (idx === activeOptionIndex) {
            opt.classList.add('is-active');
            comboboxInputBox?.setAttribute('aria-activedescendant', opt.id);
          }

          const color = getAvatarColor(member.id);
          const circle = document.createElement('span');
          circle.className = 'member-avatar-circle';
          circle.style.backgroundColor = color.bg;
          circle.style.color = color.text;
          circle.textContent = member.initials;

          const name = document.createElement('span');
          name.className = 'member-option-name';
          name.textContent = member.fullName;

          opt.appendChild(circle);
          opt.appendChild(name);

          opt.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedMember = member;
            memberSearchQuery = '';
            isComboboxOpen = false;
            render();
          });

          dropdown.appendChild(opt);
        });
      }
    }

    // Event listeners
    btnX?.addEventListener('click', closeDialog);
    btnCancel?.addEventListener('click', closeDialog);

    btnClearMember?.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedMember = null;
      memberSearchQuery = '';
      isComboboxOpen = true;
      render();
      comboboxInput?.focus();
    });

    comboboxInputBox?.addEventListener('click', () => {
      if (!selectedMember) {
        isComboboxOpen = !isComboboxOpen;
        dropdown.style.display = isComboboxOpen ? 'block' : 'none';
        comboboxInputBox.setAttribute('aria-expanded', isComboboxOpen.toString());
        if (isComboboxOpen) comboboxInput?.focus();
      }
    });

    comboboxInput?.addEventListener('input', (e) => {
      memberSearchQuery = e.target.value;
      isComboboxOpen = true;
      activeOptionIndex = 0;
      render();
      const input = panel.querySelector('#memberComboboxInput');
      input?.focus();
    });

    // Keyboard navigation
    comboboxInput?.addEventListener('keydown', (e) => {
      const items = getFilteredMembers();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        isComboboxOpen = true;
        activeOptionIndex = Math.min(items.length - 1, activeOptionIndex + 1);
        render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        isComboboxOpen = true;
        activeOptionIndex = Math.max(0, activeOptionIndex - 1);
        render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isComboboxOpen && items[activeOptionIndex]) {
          selectedMember = items[activeOptionIndex];
          isComboboxOpen = false;
          render();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isComboboxOpen) {
          isComboboxOpen = false;
          dropdown.style.display = 'none';
        } else {
          closeDialog();
        }
      }
    });

    btnSubmit?.addEventListener('click', () => {
      if (selectedMember && selectedCards.length > 0) {
        runAssignment(selectedCards.map((c) => c.id));
      }
    });
  }

  function renderAssigningState() {
    const total = assigningProgress.total;
    const done = assigningProgress.done;

    panel.innerHTML = `
      <div class="assign-dialog-header">
        <div class="assign-dialog-title-row">
          <span class="assign-dialog-icon" aria-hidden="true">${icons.userPlus}</span>
          <h2 class="assign-dialog-title">${assignContent.copy.pick.title}</h2>
        </div>
        <button type="button" class="btn-dialog-x" disabled aria-label="Close dialog">
          ${icons.close}
        </button>
      </div>

      <div class="assign-in-flight-container">
        <div class="assign-spinner-large" aria-hidden="true"></div>
        <p class="assign-progress-text" id="assignProgressLabel" role="status" aria-live="polite">
          ${assignContent.copy.assigning.label.replace('{done}', done.toString()).replace('{total}', total.toString())}
        </p>
      </div>

      <div class="assign-dialog-footer">
        <button type="button" class="btn-dialog-cancel" disabled>${assignContent.copy.pick.btnCancel}</button>
        <button type="button" class="btn-dialog-primary" disabled>
          <span class="btn-spinner" aria-hidden="true"></span>
          <span>Assigning...</span>
        </button>
      </div>
    `;
  }

  function renderSuccessState() {
    const succeededIds = assignmentResults.filter((r) => r.ok).map((r) => r.cardId);
    const count = succeededIds.length;

    // Calculate distinct lists updated
    const { scanResult } = store.getState();
    const cardsMap = new Map((scanResult?.cards || []).map((c) => [c.id, c]));
    const distinctListIds = new Set();
    succeededIds.forEach((id) => {
      const card = cardsMap.get(id);
      if (card) distinctListIds.add(card.listId);
    });
    const listsUpdatedCount = distinctListIds.size;

    panel.innerHTML = `
      <div class="assign-dialog-header" style="justify-content: flex-end;">
        <button type="button" class="btn-dialog-x" id="btnDialogX" aria-label="Close dialog">
          ${icons.close}
        </button>
      </div>

      <div class="assign-success-body">
        <!-- Graphic area: Kanban graphic with green check badge -->
        <div class="assign-success-graphic" aria-hidden="true">
          <div class="graphic-board-mockup">
            <div class="graphic-header-bar">
              <span class="graphic-dot"></span>
              <span class="graphic-dot"></span>
              <span class="graphic-dot"></span>
            </div>
            <div class="graphic-card-row">
              <div class="graphic-avatar-circle">
                <span class="graphic-user-icon">${icons.user}</span>
                <span class="graphic-badge-check">${icons.checkCircle}</span>
              </div>
            </div>
          </div>
          <span class="graphic-sparkles">${icons.spark}</span>
        </div>

        <h2 class="assign-success-heading">${assignContent.copy.success.title}</h2>
        <p class="assign-success-subtext">
          ${assignContent.copy.success.subtext.replace('{count}', count.toString()).replace('{s}', count === 1 ? '' : 's')}
        </p>

        <div class="assign-member-pill">
          <span class="pill-icon" aria-hidden="true">${icons.user}</span>
          <span class="pill-name" id="successMemberName"></span>
        </div>

        <!-- Assignment Summary Box -->
        <div class="assign-summary-card">
          <div class="summary-card-header">
            <span class="summary-card-icon" aria-hidden="true">${icons.checklist}</span>
            <span class="summary-card-title">${assignContent.copy.success.summaryHeader}</span>
          </div>

          <div class="summary-stats-row">
            <div class="stat-col">
              <div class="stat-number">${count}</div>
              <div class="stat-label">${assignContent.copy.success.statCardsAssigned}</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-col">
              <div class="stat-number">${listsUpdatedCount}</div>
              <div class="stat-label">${assignContent.copy.success.statListsUpdated}</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-col">
              <div class="stat-check-icon" aria-hidden="true">${icons.checkCircle}</div>
              <div class="stat-label stat-completed-text">${assignContent.copy.success.statCompleted}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="assign-dialog-footer" style="justify-content: space-between;">
        <button type="button" class="btn-dialog-secondary" id="btnViewUpdated">
          ${assignContent.copy.success.btnViewUpdated}
        </button>
        <button type="button" class="btn-dialog-primary" id="btnAssignMore">
          <span aria-hidden="true">${icons.userPlus}</span>
          <span>${assignContent.copy.success.btnAssignMore}</span>
        </button>
      </div>
    `;

    const nameEl = panel.querySelector('#successMemberName');
    if (nameEl && selectedMember) {
      nameEl.textContent = selectedMember.fullName;
    }

    panel.querySelector('#btnDialogX')?.addEventListener('click', () => {
      closeDialog();
      if (typeof onSuccess === 'function') {
        onSuccess({ succeededCardIds: succeededIds, member: selectedMember, action: 'more' });
      }
    });

    panel.querySelector('#btnAssignMore')?.addEventListener('click', () => {
      closeDialog();
      if (typeof onSuccess === 'function') {
        onSuccess({ succeededCardIds: succeededIds, member: selectedMember, action: 'more' });
      }
    });

    panel.querySelector('#btnViewUpdated')?.addEventListener('click', () => {
      closeDialog();
      if (typeof onSuccess === 'function') {
        onSuccess({ succeededCardIds: succeededIds, member: selectedMember, action: 'view' });
      }
    });
  }

  function renderPartialState() {
    const succeededIds = assignmentResults.filter((r) => r.ok).map((r) => r.cardId);
    const failedItems = assignmentResults.filter((r) => !r.ok);
    const { scanResult } = store.getState();
    const cardsMap = new Map((scanResult?.cards || []).map((c) => [c.id, c]));

    panel.innerHTML = `
      <div class="assign-dialog-header">
        <div class="assign-dialog-title-row">
          <h2 class="assign-dialog-title">${assignContent.copy.partial.title}</h2>
        </div>
        <button type="button" class="btn-dialog-x" id="btnDialogX" aria-label="Close dialog">
          ${icons.close}
        </button>
      </div>

      <p class="assign-dialog-subtext">
        ${assignContent.copy.partial.subtitle
          .replace('{succeeded}', succeededIds.length.toString())
          .replace('{failed}', failedItems.length.toString())}
      </p>

      <div class="assign-failed-list" role="list">
        <!-- Failed card rows populated via JS -->
      </div>

      <div class="assign-dialog-footer">
        <button type="button" class="btn-dialog-cancel" id="btnClosePartial">${assignContent.copy.partial.btnClose}</button>
        <button type="button" class="btn-dialog-primary" id="btnRetryFailed">${assignContent.copy.partial.btnRetry}</button>
      </div>
    `;

    const listEl = panel.querySelector('.assign-failed-list');
    if (listEl) {
      failedItems.forEach((f) => {
        const row = document.createElement('div');
        row.className = 'failed-card-row';

        const card = cardsMap.get(f.cardId);
        const name = document.createElement('span');
        name.className = 'failed-card-name';
        name.textContent = card ? card.name : `Card ${f.cardId}`;

        const reason = document.createElement('span');
        reason.className = 'failed-card-reason';
        reason.textContent = f.message || 'Failed';

        row.appendChild(name);
        row.appendChild(reason);
        listEl.appendChild(row);
      });
    }

    panel.querySelector('#btnDialogX')?.addEventListener('click', () => {
      closeDialog();
      if (succeededIds.length > 0 && typeof onSuccess === 'function') {
        onSuccess({ succeededCardIds: succeededIds, member: selectedMember, action: 'more' });
      }
    });

    panel.querySelector('#btnClosePartial')?.addEventListener('click', () => {
      closeDialog();
      if (succeededIds.length > 0 && typeof onSuccess === 'function') {
        onSuccess({ succeededCardIds: succeededIds, member: selectedMember, action: 'more' });
      }
    });

    panel.querySelector('#btnRetryFailed')?.addEventListener('click', () => {
      runAssignment(failedCardIds);
    });
  }

  function renderErrorState() {
    panel.innerHTML = `
      <div class="assign-dialog-header">
        <h2 class="assign-dialog-title">${assignContent.copy.error.title}</h2>
        <button type="button" class="btn-dialog-x" id="btnDialogX" aria-label="Close dialog">
          ${icons.close}
        </button>
      </div>

      <div class="assign-error-body">
        <p class="assign-error-message" id="assignErrorMessage"></p>
      </div>

      <div class="assign-dialog-footer">
        <button type="button" class="btn-dialog-cancel" id="btnCancelError">${assignContent.copy.error.btnCancel}</button>
        <button type="button" class="btn-dialog-primary" id="btnRetryError">${assignContent.copy.error.btnRetry}</button>
      </div>
    `;

    const msgEl = panel.querySelector('#assignErrorMessage');
    if (msgEl) {
      msgEl.textContent = lastErrorMessage || assignContent.copy.error.defaultMessage;
    }

    panel.querySelector('#btnDialogX')?.addEventListener('click', closeDialog);
    panel.querySelector('#btnCancelError')?.addEventListener('click', closeDialog);
    panel.querySelector('#btnRetryError')?.addEventListener('click', () => {
      const selectedCards = getSelectedCards();
      runAssignment(selectedCards.map((c) => c.id));
    });
  }

  function render() {
    if (dialogState === 'pick') {
      renderPickState();
    } else if (dialogState === 'assigning') {
      renderAssigningState();
    } else if (dialogState === 'success') {
      renderSuccessState();
    } else if (dialogState === 'partial') {
      renderPartialState();
    } else if (dialogState === 'error') {
      renderErrorState();
    }
  }

  // Close when clicking overlay backdrop only in 'pick' state
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && dialogState === 'pick') {
      closeDialog();
    }
  });

  // Keyboard navigation & Escape
  window.addEventListener('keydown', (e) => {
    if (overlay.style.display !== 'none' && e.key === 'Escape') {
      if (dialogState === 'pick' || dialogState === 'success' || dialogState === 'partial' || dialogState === 'error') {
        closeDialog();
      }
    }
  });

  return {
    open() {
      dialogState = 'pick';
      selectedMember = null;
      memberSearchQuery = '';
      isComboboxOpen = false;
      assignmentResults = null;
      overlay.style.display = 'flex';
      render();
    },
    close: closeDialog,
  };
}
