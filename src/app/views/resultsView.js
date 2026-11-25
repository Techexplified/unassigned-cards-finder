import { resultsContent } from '../../config/resultsContent.js';
import { icons } from '../../ui/icons.js';
import {
  applyFilters,
  countsByList,
  getViewCards,
  groupByList,
  totals,
} from '../selectors.js';

/**
 * Mounts the results view into the given container.
 *
 * @param {HTMLElement} container
 * @param {{
 *   t: any,
 *   store: { getState: () => any, setState: (partial: any) => void, subscribe: (listener: any) => () => void },
 *   dataSource: { openCard: (t: any, cardId: string) => void }
 * }} param1
 * @returns {{ destroy: () => void }}
 */
export function mountResultsView(container, { t, store, dataSource }) {
  let searchDebounceTimer = null;
  let unsubscribeStore = null;

  // Initialize selectedListIds to all list IDs if empty
  const state = store.getState();
  if (state.scanResult?.lists && state.selectedListIds.size === 0) {
    store.setState({
      selectedListIds: new Set(state.scanResult.lists.map((l) => l.id)),
    });
  }

  container.innerHTML = `
    <div class="results-view">
      <!-- Left Sidebar (200px) -->
      <aside class="results-sidebar" aria-label="Filters and lists">
        <!-- Board Section -->
        <div class="sidebar-section">
          <span class="sidebar-heading">Board</span>
          <div class="board-select-box" id="boardSelectBox" role="group" aria-label="Active Trello board">
            <span class="board-icon" aria-hidden="true">${icons.board}</span>
            <span class="board-name-text" id="boardNameText"></span>
          </div>
        </div>

        <!-- Filters Section -->
        <div class="sidebar-section">
          <span class="sidebar-heading">Filters</span>
          <div class="filter-group" role="radiogroup" aria-label="Card view filter">
            <!-- Unassigned Cards radio item -->
            <button
              type="button"
              class="filter-radio-item"
              id="filterRadioUnassigned"
              role="radio"
              aria-checked="true"
            >
              <div class="filter-radio-left">
                <span class="filter-radio-icon" aria-hidden="true">${icons.userUnassigned}</span>
                <span class="filter-radio-label">Unassigned Cards</span>
              </div>
              <span class="filter-count-pill" id="countPillUnassigned">0</span>
            </button>

            <!-- All Cards radio item -->
            <button
              type="button"
              class="filter-radio-item"
              id="filterRadioAll"
              role="radio"
              aria-checked="false"
            >
              <div class="filter-radio-left">
                <span class="filter-radio-icon" aria-hidden="true">${icons.layers}</span>
                <span class="filter-radio-label">All Cards</span>
              </div>
              <span class="filter-count-pill" id="countPillAll">0</span>
            </button>
          </div>
        </div>

        <!-- Lists Section -->
        <div class="sidebar-section">
          <span class="sidebar-heading">Lists</span>
          <div class="lists-checklist" id="listsChecklist"></div>
        </div>

        <!-- Reset Filters Footer -->
        <div class="sidebar-footer">
          <button type="button" class="btn-reset-filters" id="btnResetFilters">
            <span aria-hidden="true">${icons.refresh}</span>
            <span>${resultsContent.copy.resetFilters}</span>
          </button>
        </div>
      </aside>

      <!-- Main Column -->
      <main class="results-main">
        <!-- Fixed Header Region -->
        <div class="results-header-region">
          <div class="results-top-row">
            <div class="results-heading-box">
              <h1 class="results-title" id="resultsTitle"></h1>
              <p class="results-subtext" id="resultsSubtext"></p>
            </div>

            <!-- Assign Members CTA -->
            <button
              type="button"
              class="btn-assign-members"
              id="btnAssignMembers"
              disabled
              title="${resultsContent.copy.assignButtonTooltip}"
              aria-label="Assign members to selected cards"
            >
              <span aria-hidden="true">${icons.userPlus}</span>
              <span>${resultsContent.copy.assignButtonLabel}</span>
            </button>
          </div>

          <!-- Toolbar: Search & Sort -->
          <div class="results-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon" aria-hidden="true">${icons.search}</span>
              <input
                type="text"
                class="search-input"
                id="searchInput"
                placeholder="${resultsContent.copy.searchPlaceholder}"
                aria-label="Search cards"
              />
            </div>

            <div class="sort-select-wrapper">
              <label for="sortSelect" class="sort-label">${resultsContent.copy.sortLabel}</label>
              <select class="sort-select" id="sortSelect" aria-label="Sort cards by">
                ${resultsContent.sortOptions
                  .map((opt) => `<option value="${opt.id}">${opt.label}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Scrollable Cards Region -->
        <div
          class="results-cards-container"
          id="resultsCardsContainer"
          tabindex="0"
          aria-label="Grouped cards list"
        ></div>
      </main>

      <!-- Assign Members In-Page Dialog Placeholder -->
      <div
        id="assignDialogOverlay"
        class="dialog-overlay"
        style="display: none;"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogTitle"
      >
        <div class="dialog-modal">
          <h2 class="dialog-title" id="dialogTitle">${resultsContent.copy.assignDialog.title}</h2>
          <p class="dialog-message">${resultsContent.copy.assignDialog.message}</p>
          <div class="dialog-badge" id="dialogCountBadge"></div>
          <div class="dialog-actions">
            <button type="button" class="btn-dialog-close" id="btnDialogClose">
              ${resultsContent.copy.assignDialog.closeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Grab cached DOM elements
  const boardNameText = container.querySelector('#boardNameText');
  const filterRadioUnassigned = container.querySelector('#filterRadioUnassigned');
  const filterRadioAll = container.querySelector('#filterRadioAll');
  const countPillUnassigned = container.querySelector('#countPillUnassigned');
  const countPillAll = container.querySelector('#countPillAll');
  const listsChecklist = container.querySelector('#listsChecklist');
  const btnResetFilters = container.querySelector('#btnResetFilters');
  const resultsTitle = container.querySelector('#resultsTitle');
  const resultsSubtext = container.querySelector('#resultsSubtext');
  const btnAssignMembers = container.querySelector('#btnAssignMembers');
  const searchInput = container.querySelector('#searchInput');
  const sortSelect = container.querySelector('#sortSelect');
  const resultsCardsContainer = container.querySelector('#resultsCardsContainer');
  const assignDialogOverlay = container.querySelector('#assignDialogOverlay');
  const dialogCountBadge = container.querySelector('#dialogCountBadge');
  const btnDialogClose = container.querySelector('#btnDialogClose');

  /**
   * Updates sidebar counts and active filter tabs
   */
  function updateSidebar(currentState) {
    const { scanResult, resultsViewMode, selectedListIds } = currentState;
    if (!scanResult) return;

    if (boardNameText) {
      boardNameText.textContent = scanResult.board.name;
    }

    // Totals
    const tCounts = totals(scanResult);
    if (countPillUnassigned) countPillUnassigned.textContent = tCounts.unassigned.toString();
    if (countPillAll) countPillAll.textContent = tCounts.all.toString();

    // Active tab styling
    const isUnassigned = resultsViewMode === 'unassigned';
    if (filterRadioUnassigned) {
      filterRadioUnassigned.classList.toggle('is-active', isUnassigned);
      filterRadioUnassigned.setAttribute('aria-checked', isUnassigned.toString());
    }
    if (filterRadioAll) {
      filterRadioAll.classList.toggle('is-active', !isUnassigned);
      filterRadioAll.setAttribute('aria-checked', (!isUnassigned).toString());
    }

    // List checkboxes
    const listCounts = countsByList(scanResult, resultsViewMode);
    if (listsChecklist) {
      listsChecklist.textContent = '';
      scanResult.lists.forEach((list) => {
        const row = document.createElement('label');
        row.className = 'list-check-row';

        const left = document.createElement('div');
        left.className = 'list-check-left';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'custom-checkbox';
        checkbox.checked = selectedListIds.has(list.id);
        checkbox.setAttribute('aria-label', `Show ${list.name} cards`);

        checkbox.addEventListener('change', () => {
          const nextSet = new Set(store.getState().selectedListIds);
          if (checkbox.checked) {
            nextSet.add(list.id);
          } else {
            nextSet.delete(list.id);
          }
          store.setState({ selectedListIds: nextSet });
        });

        const nameLabel = document.createElement('span');
        nameLabel.className = 'list-name-label';
        nameLabel.textContent = list.name;

        left.appendChild(checkbox);
        left.appendChild(nameLabel);

        const countPill = document.createElement('span');
        countPill.className = 'list-count-pill';
        countPill.textContent = (listCounts[list.id] || 0).toString();

        row.appendChild(left);
        row.appendChild(countPill);
        listsChecklist.appendChild(row);
      });
    }
  }

  /**
   * Updates main column heading and Assign Members CTA
   */
  function updateMainHeader(currentState) {
    const { scanResult, resultsViewMode, selectedCardIds } = currentState;
    if (!scanResult) return;

    const tCounts = totals(scanResult);
    const count = resultsViewMode === 'unassigned' ? tCounts.unassigned : tCounts.all;

    if (resultsTitle) {
      resultsTitle.textContent = '';
      const numSpan = document.createElement('span');
      numSpan.className = 'results-title-number';
      numSpan.textContent = count.toString();

      resultsTitle.appendChild(numSpan);

      if (resultsViewMode === 'unassigned') {
        const textNode = document.createTextNode(
          ` Unassigned Card${count === 1 ? '' : 's'} Found `
        );
        resultsTitle.appendChild(textNode);

        const sparkSpan = document.createElement('span');
        sparkSpan.className = 'results-title-spark';
        sparkSpan.setAttribute('aria-hidden', 'true');
        sparkSpan.innerHTML = icons.spark;
        resultsTitle.appendChild(sparkSpan);
      } else {
        const textNode = document.createTextNode(` Card${count === 1 ? '' : 's'}`);
        resultsTitle.appendChild(textNode);
      }
    }

    if (resultsSubtext) {
      resultsSubtext.textContent =
        resultsViewMode === 'unassigned'
          ? resultsContent.copy.unassignedSubtext
          : resultsContent.copy.allSubtext;
    }

    // Assign button state
    if (btnAssignMembers) {
      const hasSelection = selectedCardIds.size > 0;
      btnAssignMembers.disabled = !hasSelection;
      if (!hasSelection) {
        btnAssignMembers.setAttribute('title', resultsContent.copy.assignButtonTooltip);
      } else {
        btnAssignMembers.removeAttribute('title');
      }
    }
  }

  /**
   * Updates the scrollable cards area
   */
  function updateCardsList(currentState) {
    const {
      scanResult,
      resultsViewMode,
      selectedListIds,
      searchQuery,
      sortOrder,
      selectedCardIds,
      collapsedListIds,
    } = currentState;
    if (!resultsCardsContainer || !scanResult) return;

    resultsCardsContainer.textContent = '';

    const viewCards = getViewCards(scanResult, resultsViewMode);
    const filteredCards = applyFilters(viewCards, {
      listIds: selectedListIds,
      query: searchQuery,
    });

    // Empty state 1: No cards at all for this mode
    if (viewCards.length === 0) {
      const box = document.createElement('div');
      box.className = 'empty-state-box';

      const tEl = document.createElement('h3');
      tEl.className = 'empty-state-title';
      tEl.textContent = resultsContent.copy.emptyUnassigned.title;

      const subEl = document.createElement('p');
      subEl.className = 'empty-state-subtitle';
      subEl.textContent = resultsContent.copy.emptyUnassigned.subtitle;

      box.appendChild(tEl);
      box.appendChild(subEl);
      resultsCardsContainer.appendChild(box);
      return;
    }

    // Empty state 2: Filters match zero cards
    if (filteredCards.length === 0) {
      const box = document.createElement('div');
      box.className = 'empty-state-box';

      const tEl = document.createElement('h3');
      tEl.className = 'empty-state-title';
      tEl.textContent = resultsContent.copy.emptyFilter.title;

      const subEl = document.createElement('p');
      subEl.className = 'empty-state-subtitle';
      subEl.textContent = resultsContent.copy.emptyFilter.subtitle;

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn-reset-filters';
      resetBtn.style.maxWidth = '160px';
      resetBtn.textContent = resultsContent.copy.emptyFilter.button;
      resetBtn.addEventListener('click', handleResetFilters);

      box.appendChild(tEl);
      box.appendChild(subEl);
      box.appendChild(resetBtn);
      resultsCardsContainer.appendChild(box);
      return;
    }

    // Group cards by list
    const groups = groupByList(filteredCards, scanResult.lists, sortOrder);

    groups.forEach(({ list, cards }) => {
      const groupCard = document.createElement('article');
      groupCard.className = 'card-group';

      const isCollapsed = collapsedListIds.has(list.id);

      // Checkbox state for group
      const selectedInGroup = cards.filter((c) => selectedCardIds.has(c.id)).length;
      const allSelectedInGroup = selectedInGroup === cards.length && cards.length > 0;
      const someSelectedInGroup = selectedInGroup > 0 && !allSelectedInGroup;

      // Group Header
      const header = document.createElement('div');
      header.className = 'group-header';

      const left = document.createElement('div');
      left.className = 'group-header-left';

      const groupCheckbox = document.createElement('input');
      groupCheckbox.type = 'checkbox';
      groupCheckbox.className = 'custom-checkbox';
      groupCheckbox.checked = allSelectedInGroup;
      groupCheckbox.indeterminate = someSelectedInGroup;
      groupCheckbox.setAttribute('aria-label', `Select all cards in ${list.name}`);

      groupCheckbox.addEventListener('change', () => {
        const nextSet = new Set(store.getState().selectedCardIds);
        if (groupCheckbox.checked) {
          cards.forEach((c) => nextSet.add(c.id));
        } else {
          cards.forEach((c) => nextSet.delete(c.id));
        }
        store.setState({ selectedCardIds: nextSet });
      });

      const title = document.createElement('h2');
      title.className = 'group-title';
      title.textContent = list.name;

      const countPill = document.createElement('span');
      countPill.className = 'group-count-pill';
      countPill.textContent = cards.length.toString();

      left.appendChild(groupCheckbox);
      left.appendChild(title);
      left.appendChild(countPill);

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn-toggle-group';
      toggleBtn.setAttribute('aria-label', `Toggle ${list.name} group`);
      toggleBtn.setAttribute('aria-expanded', (!isCollapsed).toString());
      toggleBtn.innerHTML = isCollapsed ? icons.chevronDown : icons.chevronUp;

      toggleBtn.addEventListener('click', () => {
        const nextCollapsed = new Set(store.getState().collapsedListIds);
        if (isCollapsed) {
          nextCollapsed.delete(list.id);
        } else {
          nextCollapsed.add(list.id);
        }
        store.setState({ collapsedListIds: nextCollapsed });
      });

      header.appendChild(left);
      header.appendChild(toggleBtn);
      groupCard.appendChild(header);

      // Group Cards (when not collapsed)
      if (!isCollapsed) {
        const cardsList = document.createElement('div');
        cardsList.className = 'group-cards-list';

        cards.forEach((card) => {
          const row = document.createElement('div');
          row.className = 'card-row';

          const cardCheckbox = document.createElement('input');
          cardCheckbox.type = 'checkbox';
          cardCheckbox.className = 'custom-checkbox';
          cardCheckbox.checked = selectedCardIds.has(card.id);
          cardCheckbox.setAttribute('aria-label', `Select card ${card.name}`);

          cardCheckbox.addEventListener('change', () => {
            const nextSet = new Set(store.getState().selectedCardIds);
            if (cardCheckbox.checked) {
              nextSet.add(card.id);
            } else {
              nextSet.delete(card.id);
            }
            store.setState({ selectedCardIds: nextSet });
          });

          const nameSpan = document.createElement('span');
          nameSpan.className = 'card-title';
          nameSpan.textContent = card.name;

          const labelsWrapper = document.createElement('div');
          labelsWrapper.className = 'card-labels';

          if (Array.isArray(card.labels) && card.labels.length > 0) {
            const firstLabel = card.labels[0];
            const chip = document.createElement('span');
            const colorClass =
              resultsContent.labelColors[firstLabel.color] || 'chip-gray';
            chip.className = `label-chip ${colorClass}`;

            const tagIcon = document.createElement('span');
            tagIcon.className = 'label-chip-icon';
            tagIcon.setAttribute('aria-hidden', 'true');
            tagIcon.innerHTML = icons.tag;

            const labelText = document.createTextNode(` ${firstLabel.name}`);
            chip.appendChild(tagIcon);
            chip.appendChild(labelText);
            labelsWrapper.appendChild(chip);

            if (card.labels.length > 1) {
              const moreChip = document.createElement('span');
              moreChip.className = 'chip-more';
              moreChip.textContent = `+${card.labels.length - 1}`;
              labelsWrapper.appendChild(moreChip);
            }
          }

          const openBtn = document.createElement('button');
          openBtn.type = 'button';
          openBtn.className = 'btn-open-card';
          openBtn.setAttribute('aria-label', `Open card ${card.name}`);
          openBtn.innerHTML = icons.externalLink;
          openBtn.addEventListener('click', () => {
            dataSource.openCard(t, card.id);
          });

          row.appendChild(cardCheckbox);
          row.appendChild(nameSpan);
          row.appendChild(labelsWrapper);
          row.appendChild(openBtn);
          cardsList.appendChild(row);
        });

        groupCard.appendChild(cardsList);
      }

      resultsCardsContainer.appendChild(groupCard);
    });
  }

  function handleResetFilters() {
    const currentState = store.getState();
    const allListIds = new Set((currentState.scanResult?.lists || []).map((l) => l.id));
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'list-asc';

    store.setState({
      resultsViewMode: 'unassigned',
      selectedListIds: allListIds,
      searchQuery: '',
      sortOrder: 'list-asc',
      // selectedCardIds is deliberately preserved!
    });
  }

  function renderDialog(currentState) {
    if (!assignDialogOverlay) return;

    if (currentState.dialogOpen) {
      assignDialogOverlay.style.display = 'flex';
      if (dialogCountBadge) {
        const count = currentState.selectedCardIds.size;
        dialogCountBadge.textContent = resultsContent.copy.assignDialog.selectedCountTemplate
          .replace('{count}', count.toString())
          .replace('{s}', count === 1 ? '' : 's');
      }
      btnDialogClose?.focus();
    } else {
      assignDialogOverlay.style.display = 'none';
    }
  }

  function closeDialog() {
    store.setState({ dialogOpen: false });
    btnAssignMembers?.focus();
  }

  // Event Listeners
  filterRadioUnassigned?.addEventListener('click', () => {
    store.setState({ resultsViewMode: 'unassigned' });
  });

  filterRadioAll?.addEventListener('click', () => {
    store.setState({ resultsViewMode: 'all' });
  });

  btnResetFilters?.addEventListener('click', handleResetFilters);

  // Search input debounced handler (does NOT re-render input to maintain caret & focus)
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      store.setState({ searchQuery: e.target.value });
    }, 150);
  });

  sortSelect?.addEventListener('change', (e) => {
    store.setState({ sortOrder: e.target.value });
  });

  btnAssignMembers?.addEventListener('click', () => {
    if (store.getState().selectedCardIds.size > 0) {
      // TODO: Future flow:
      // 1. Pick members from Trello board members list
      // 2. PUT /1/cards/{id}/idMembers per selected card (or batch request)
      // 3. Refresh scan data from Trello REST API
      store.setState({ dialogOpen: true });
    }
  });

  btnDialogClose?.addEventListener('click', closeDialog);

  // Keyboard accessibility: Escape closes dialog
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && store.getState().dialogOpen) {
      closeDialog();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  // Subscribe to store updates
  unsubscribeStore = store.subscribe((currentState) => {
    updateSidebar(currentState);
    updateMainHeader(currentState);
    updateCardsList(currentState);
    renderDialog(currentState);
  });

  // Initial render
  const initial = store.getState();
  if (sortSelect) sortSelect.value = initial.sortOrder;
  if (searchInput) searchInput.value = initial.searchQuery;

  updateSidebar(initial);
  updateMainHeader(initial);
  updateCardsList(initial);
  renderDialog(initial);

  return {
    destroy() {
      clearTimeout(searchDebounceTimer);
      if (typeof unsubscribeStore === 'function') unsubscribeStore();
      window.removeEventListener('keydown', handleKeyDown);
    },
  };
}
