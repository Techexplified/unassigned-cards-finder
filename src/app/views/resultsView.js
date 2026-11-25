import { getAvatarColor } from '../../config/assignContent.js';
import { resultsContent } from '../../config/resultsContent.js';
import * as dataSource from '../../data/dataSource.js';
import { icons } from '../../ui/icons.js';
import {
  applyFilters,
  countsByList,
  getViewCards,
  groupByList,
  totals,
} from '../selectors.js';
import { createAssignDialog } from './assignDialog.js';

/**
 * Mounts the results view into the given container.
 *
 * @param {HTMLElement} container
 * @param {{
 *   t: any,
 *   store: any,
 *   onAuthError: (message: string) => void
 * }} param1
 * @returns {{ destroy: () => void }}
 */
export function mountResultsView(container, { t, store, onAuthError }) {
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

        <!-- Dismissible notices area (Truncated and Recently Updated) -->
        <div id="resultsNoticesArea" style="display: flex; flex-direction: column;"></div>

        <!-- Scrollable Cards Region -->
        <div
          class="results-cards-container"
          id="resultsCardsContainer"
          tabindex="0"
          aria-label="Grouped cards list"
        ></div>
      </main>

      <!-- In-Page Assign Members Dialog Container -->
      <div id="assignDialogHost"></div>
    </div>
  `;

  // Cached DOM elements
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
  const resultsNoticesArea = container.querySelector('#resultsNoticesArea');
  const assignDialogHost = container.querySelector('#assignDialogHost');

  // Member lookup map
  function getMemberMap() {
    const { scanResult } = store.getState();
    const map = new Map();
    (scanResult?.members || []).forEach((m) => map.set(m.id, m));
    return map;
  }

  // Create Assign Dialog Controller
  const assignDialog = createAssignDialog({
    container: assignDialogHost,
    t,
    store,
    triggerButton: btnAssignMembers,
    onSuccess: ({ succeededCardIds, member, action }) => {
      // 1. Immutable update of scanResult in memory
      const currentState = store.getState();
      const nextCards = (currentState.scanResult?.cards || []).map((card) => {
        if (succeededCardIds.includes(card.id)) {
          const nextMembers = card.idMembers.includes(member.id)
            ? card.idMembers
            : [...card.idMembers, member.id];
          return { ...card, idMembers: nextMembers };
        }
        return card;
      });

      const nextScanResult = {
        ...currentState.scanResult,
        cards: nextCards,
      };

      // 2. Remove succeeded IDs from selectedCardIds
      const nextSelectedCardIds = new Set(currentState.selectedCardIds);
      succeededCardIds.forEach((id) => nextSelectedCardIds.delete(id));

      if (action === 'view') {
        store.setState({
          scanResult: nextScanResult,
          selectedCardIds: nextSelectedCardIds,
          resultsViewMode: 'all',
          recentlyAssignedIds: new Set(succeededCardIds),
        });
      } else {
        // action === 'more'
        store.setState({
          scanResult: nextScanResult,
          selectedCardIds: new Set(),
          resultsViewMode: 'unassigned',
          recentlyAssignedIds: new Set(),
        });
        resultsCardsContainer?.focus();
      }
    },
    onAuthError,
  });

  /**
   * Updates dismissible notices (Truncated and Recently Updated)
   */
  function updateNotices(currentState) {
    if (!resultsNoticesArea) return;
    resultsNoticesArea.textContent = '';

    const { scanResult, recentlyAssignedIds, dismissedTruncatedNotice } = currentState;

    // Recently Updated Notice
    if (recentlyAssignedIds && recentlyAssignedIds.size > 0) {
      const banner = document.createElement('div');
      banner.className = 'dismissible-banner banner-recently-assigned';

      const text = document.createElement('span');
      text.textContent = `Showing ${recentlyAssignedIds.size} card${recentlyAssignedIds.size === 1 ? '' : 's'} you just updated.`;

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn-banner-clear';
      clearBtn.textContent = 'Clear';
      clearBtn.addEventListener('click', () => {
        store.setState({ recentlyAssignedIds: new Set() });
      });

      banner.appendChild(text);
      banner.appendChild(clearBtn);
      resultsNoticesArea.appendChild(banner);
    }

    // Truncated Board Notice (first 1000 cards)
    if (scanResult?.truncated && !dismissedTruncatedNotice) {
      const banner = document.createElement('div');
      banner.className = 'dismissible-banner banner-truncated';

      const text = document.createElement('span');
      text.textContent = 'Showing the first 1000 cards on this board.';

      const dismissBtn = document.createElement('button');
      dismissBtn.type = 'button';
      dismissBtn.className = 'btn-banner-clear';
      dismissBtn.textContent = 'Dismiss';
      dismissBtn.addEventListener('click', () => {
        store.setState({ dismissedTruncatedNotice: true });
      });

      banner.appendChild(text);
      banner.appendChild(dismissBtn);
      resultsNoticesArea.appendChild(banner);
    }
  }

  /**
   * Updates sidebar counts and list checkboxes
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
      recentlyAssignedIds,
    } = currentState;
    if (!resultsCardsContainer || !scanResult) return;

    resultsCardsContainer.textContent = '';

    let viewCards = getViewCards(scanResult, resultsViewMode);

    // If recentlyAssignedIds filter is active, filter cards to those IDs
    if (recentlyAssignedIds && recentlyAssignedIds.size > 0) {
      viewCards = viewCards.filter((c) => recentlyAssignedIds.has(c.id));
    }

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
    const memberMap = getMemberMap();

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

          // Assigned members initials badges (between card name and label chips)
          const membersBadgeWrapper = document.createElement('div');
          membersBadgeWrapper.className = 'card-members-badges';

          if (Array.isArray(card.idMembers) && card.idMembers.length > 0) {
            const assignedMembers = card.idMembers
              .map((id) => memberMap.get(id))
              .filter(Boolean);

            const displayMembers = assignedMembers.slice(0, 2);
            displayMembers.forEach((m) => {
              const badge = document.createElement('span');
              badge.className = 'member-initials-badge';
              const color = getAvatarColor(m.id);
              badge.style.backgroundColor = color.bg;
              badge.style.color = color.text;
              badge.textContent = m.initials;
              badge.setAttribute('title', m.fullName);
              membersBadgeWrapper.appendChild(badge);
            });

            if (assignedMembers.length > 2) {
              const moreBadge = document.createElement('span');
              moreBadge.className = 'member-badge-more';
              moreBadge.textContent = `+${assignedMembers.length - 2}`;
              membersBadgeWrapper.appendChild(moreBadge);
            }
          }

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
          if (card.idMembers?.length > 0) {
            row.appendChild(membersBadgeWrapper);
          }
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
      recentlyAssignedIds: new Set(),
      // selectedCardIds is deliberately preserved!
    });
  }

  // Event Listeners
  filterRadioUnassigned?.addEventListener('click', () => {
    store.setState({ resultsViewMode: 'unassigned', recentlyAssignedIds: new Set() });
  });

  filterRadioAll?.addEventListener('click', () => {
    store.setState({ resultsViewMode: 'all', recentlyAssignedIds: new Set() });
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
      assignDialog.open();
    }
  });

  // Subscribe to store updates
  unsubscribeStore = store.subscribe((currentState) => {
    updateNotices(currentState);
    updateSidebar(currentState);
    updateMainHeader(currentState);
    updateCardsList(currentState);
  });

  // Initial render
  const initial = store.getState();
  if (sortSelect) sortSelect.value = initial.sortOrder;
  if (searchInput) searchInput.value = initial.searchQuery;

  updateNotices(initial);
  updateSidebar(initial);
  updateMainHeader(initial);
  updateCardsList(initial);

  return {
    destroy() {
      clearTimeout(searchDebounceTimer);
      if (typeof unsubscribeStore === 'function') unsubscribeStore();
      assignDialog.close();
    },
  };
}
