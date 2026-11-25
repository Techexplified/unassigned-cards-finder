import { appConfig } from '../config/appConfig.js';
import * as dataSource from '../data/dataSource.js';
import { icons } from '../ui/icons.js';
import { createStore } from './state.js';
import { mountLandingView } from './views/landingView.js';
import { mountResultsView } from './views/resultsView.js';
import { mountScanningView } from './views/scanningView.js';

/* global TrelloPowerUp */

// Initialize Power-Up iframe interface if running inside Trello environment
let t = null;
if (typeof window !== 'undefined' && typeof window.TrelloPowerUp !== 'undefined') {
  try {
    t = window.TrelloPowerUp.iframe({
      appKey: appConfig.appKey,
      appName: appConfig.appName,
      appAuthor: appConfig.appAuthor,
    });
  } catch (err) {
    console.warn('TrelloPowerUp.iframe() initialization failed; running in standalone mode:', err);
  }
} else {
  console.info('TrelloPowerUp not detected; rendering Power-Up in browser preview mode.');
}

// Global UI State Store
const store = createStore({
  view: 'landing', // 'landing' | 'scanning' | 'results'
  scanResult: null,
  // Results view state
  resultsViewMode: 'unassigned', // 'unassigned' | 'all'
  selectedListIds: new Set(),
  searchQuery: '',
  sortOrder: 'list-asc', // 'list-asc' | 'list-desc' | 'name-asc' | 'name-desc'
  selectedCardIds: new Set(),
  collapsedListIds: new Set(),
  dialogOpen: false,
});

// App coordinator
function initApp() {
  const headerIcon = document.getElementById('headerIcon');
  if (headerIcon && icons.people) {
    headerIcon.innerHTML = icons.people;
  }

  const viewContainer = document.getElementById('viewContainer');
  if (!viewContainer) {
    console.error('View container element (#viewContainer) not found in DOM.');
    return;
  }

  let currentViewInstance = null;
  let activeViewName = null;

  function renderView(state) {
    if (state.view === activeViewName) {
      return;
    }

    // Teardown previous view instance if active
    if (currentViewInstance && typeof currentViewInstance.destroy === 'function') {
      currentViewInstance.destroy();
      currentViewInstance = null;
    }

    activeViewName = state.view;
    viewContainer.textContent = '';

    if (state.view === 'landing') {
      currentViewInstance = mountLandingView(viewContainer, {
        onStartScan: () => {
          store.setState({ view: 'scanning' });
        },
      });
    } else if (state.view === 'scanning') {
      currentViewInstance = mountScanningView(viewContainer, {
        t,
        dataSource,
        onComplete: (scanResult) => {
          const allListIds = new Set((scanResult.lists || []).map((l) => l.id));
          store.setState({
            scanResult,
            view: 'results',
            selectedListIds: allListIds,
            resultsViewMode: 'unassigned',
            searchQuery: '',
            sortOrder: 'list-asc',
            selectedCardIds: new Set(),
            collapsedListIds: new Set(),
            dialogOpen: false,
          });
        },
        onBack: () => {
          store.setState({ view: 'landing' });
        },
      });
    } else if (state.view === 'results') {
      currentViewInstance = mountResultsView(viewContainer, {
        t,
        store,
        dataSource,
      });
    }
  }

  // Subscribe to state changes for view switching
  store.subscribe(renderView);

  // Initial render
  renderView(store.getState());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
