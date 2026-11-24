import { appConfig } from '../config/appConfig.js';
import { landingContent } from '../config/landingContent.js';
import { startScan } from '../data/dataSource.js';
import { icons } from '../ui/icons.js';

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
  console.info('TrelloPowerUp not detected; rendering landing screen in browser preview mode.');
}

// DOM Elements
const headerIconEl = document.getElementById('headerIcon');
const landingTitleEl = document.getElementById('landingTitle');
const landingSubtitleEl = document.getElementById('landingSubtitle');
const featureListEl = document.getElementById('featureList');
const btnScan = document.getElementById('btnScan');
const btnIconStart = document.getElementById('btnIconStart');
const btnIconEnd = document.getElementById('btnIconEnd');
const btnSpinner = document.getElementById('btnSpinner');
const btnLabel = document.getElementById('btnLabel');
const statusMessageEl = document.getElementById('statusMessage');
const landingIllustrationEl = document.getElementById('landingIllustration');
const illustrationFallbackEl = document.getElementById('illustrationFallback');

/**
 * Renders the header and static SVGs.
 * innerHTML is strictly restricted to static icon strings from icons.js.
 */
function renderHeader() {
  if (headerIconEl && icons.people) {
    headerIconEl.innerHTML = icons.people;
  }
}

/**
 * Renders the heading.
 * All text is assigned strictly via textContent (no innerHTML).
 *
 * @param {string} fullTitle
 */
function renderHeading(fullTitle) {
  if (!landingTitleEl) return;
  landingTitleEl.textContent = fullTitle;
}

/**
 * Dynamically renders the features list based on configuration.
 * All text is safely assigned via textContent.
 *
 * @param {Array<{ id: string, icon: string, title: string, description: string }>} features
 */
function renderFeatures(features) {
  if (!featureListEl || !Array.isArray(features)) return;
  featureListEl.textContent = '';

  features.forEach((feature) => {
    const li = document.createElement('li');
    li.className = 'feature-item';
    li.dataset.featureId = feature.id;

    // Icon tile (innerHTML allowed strictly for static known SVG string)
    const iconTile = document.createElement('div');
    iconTile.className = 'feature-icon-tile';
    iconTile.setAttribute('aria-hidden', 'true');
    if (icons[feature.icon]) {
      iconTile.innerHTML = icons[feature.icon];
    }

    // Text container
    const infoContainer = document.createElement('div');
    infoContainer.className = 'feature-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'feature-title';
    titleEl.textContent = feature.title;

    const descEl = document.createElement('p');
    descEl.className = 'feature-description';
    descEl.textContent = feature.description;

    infoContainer.appendChild(titleEl);
    infoContainer.appendChild(descEl);

    li.appendChild(iconTile);
    li.appendChild(infoContainer);
    featureListEl.appendChild(li);
  });
}

/**
 * Initializes the CTA button text and icons.
 *
 * @param {{ label: string }} ctaConfig
 */
function renderCta(ctaConfig) {
  if (!btnScan) return;

  if (btnIconStart && icons.search) {
    btnIconStart.innerHTML = icons.search;
  }
  if (btnIconEnd && icons.arrowRight) {
    btnIconEnd.innerHTML = icons.arrowRight;
  }
  if (btnLabel) {
    btnLabel.textContent = ctaConfig.label || 'Scan Board';
  }
}

/**
 * Handles image missing/broken error to show neutral placeholder box.
 */
function setupIllustrationFallback() {
  if (!landingIllustrationEl || !illustrationFallbackEl) return;

  const showFallback = () => {
    landingIllustrationEl.style.display = 'none';
    illustrationFallbackEl.style.display = 'flex';
  };

  landingIllustrationEl.addEventListener('error', showFallback);

  // If already broken or empty upon script execution
  if (landingIllustrationEl.complete && landingIllustrationEl.naturalWidth === 0) {
    showFallback();
  }
}

/**
 * Sets button loading state.
 *
 * @param {boolean} isLoading
 */
function setLoadingState(isLoading) {
  if (!btnScan) return;

  btnScan.disabled = isLoading;

  if (isLoading) {
    btnIconStart.style.display = 'none';
    btnIconEnd.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    btnLabel.textContent = 'Scanning...';
    if (statusMessageEl) {
      statusMessageEl.textContent = '';
    }
  } else {
    btnIconStart.style.display = 'inline-flex';
    btnIconEnd.style.display = 'inline-flex';
    btnSpinner.style.display = 'none';
    btnLabel.textContent = landingContent.cta.label || 'Scan Board';
  }
}

/**
 * Scan board click handler.
 */
async function handleScanClick() {
  if (btnScan.disabled) return;

  setLoadingState(true);

  try {
    const result = await startScan(t);

    // Reset button after scan resolves
    setLoadingState(false);

    // TODO: Navigate to future results screen:
    // if (t && typeof t.modal === 'function') {
    //   t.modal({
    //     url: './results.html',
    //     height: 520,
    //     fullscreen: false,
    //   });
    // }
    console.info('Scan completed successfully:', result);
  } catch (err) {
    setLoadingState(false);
    console.error('Scan failed:', err);
    if (statusMessageEl) {
      // Display inline error message without alert/confirm/prompt
      statusMessageEl.textContent =
        err && err.message
          ? err.message
          : 'Unable to scan board. Please check your connection and try again.';
    }
  }
}

/**
 * Bootstraps the landing page.
 */
function initLandingPage() {
  renderHeader();
  renderHeading(landingContent.title);

  if (landingSubtitleEl) {
    landingSubtitleEl.textContent = landingContent.subtitle;
  }

  renderFeatures(landingContent.features);
  renderCta(landingContent.cta);
  setupIllustrationFallback();

  if (btnScan) {
    btnScan.addEventListener('click', handleScanClick);
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandingPage);
} else {
  initLandingPage();
}
