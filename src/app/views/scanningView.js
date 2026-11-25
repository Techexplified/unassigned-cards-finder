import { scanContent } from '../../config/scanContent.js';
import { icons } from '../../ui/icons.js';

/**
 * Mounts the scanning/progress screen view into the given container.
 *
 * @param {HTMLElement} container
 * @param {{
 *   t: any,
 *   dataSource: any,
 *   onComplete: (scanResult: any) => void,
 *   onBack: () => void
 * }} params
 * @returns {{ destroy: () => void }}
 */
export function mountScanningView(container, { t, dataSource, onComplete, onBack }) {
  let isCancelled = false;

  container.innerHTML = `
    <div class="scanning-view">
      <!-- Centered Scanning Illustration -->
      <div class="scanning-illustration-wrapper">
        <img
          id="scanningIllustration"
          src="./assets/scanning-illustration.png"
          alt="Illustration of scanning cards"
          class="scanning-illustration"
        />
        <div
          id="scanningFallback"
          class="illustration-fallback"
          role="img"
          aria-label="Scanning illustration placeholder"
          style="display: none;"
        >
          <span class="fallback-title">Scanning Illustration</span>
          <span class="fallback-desc">public/assets/scanning-illustration.png</span>
        </div>
      </div>

      <!-- Heading & Subtext -->
      <h1 class="scanning-heading" id="scanningHeading"></h1>
      <p class="scanning-subtext" id="scanningSubtext"></p>

      <!-- Main Progress & Steps Region -->
      <div id="scanningMainContent" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
        <!-- Progress Bar -->
        <div class="progress-container">
          <div
            class="progress-track"
            role="progressbar"
            aria-valuenow="0"
            aria-valuemin="0"
            aria-valuemax="100"
            id="progressBarTrack"
          >
            <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
          </div>
          <span class="progress-percent" id="progressPercent" aria-hidden="true">0%</span>
        </div>

        <!-- 3-Step rounded row container -->
        <div class="scan-steps-card" id="scanStepsCard" role="list"></div>

        <!-- Polite aria-live status for screen readers -->
        <div
          id="scanLiveRegion"
          class="sr-only"
          role="status"
          aria-live="polite"
          style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0);"
        >
          Connecting to board... 0%
        </div>
      </div>

      <!-- Error State Container (hidden by default) -->
      <div id="scanningErrorContainer" style="display: none;"></div>
    </div>

    <!-- Decorative bottom wave -->
    <div class="wave-container" aria-hidden="true">
      <svg class="bottom-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">
        <path
          fill="#EDE5FA"
          fill-opacity="0.7"
          d="M0,64L60,69.3C120,75,240,85,360,74.7C480,64,600,32,720,26.7C840,21,960,43,1080,53.3C1200,64,1320,64,1380,64L1440,64L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"
        ></path>
      </svg>
    </div>
  `;

  // Set headings safely via textContent
  const headingEl = container.querySelector('#scanningHeading');
  if (headingEl) headingEl.textContent = scanContent.title;

  const subtextEl = container.querySelector('#scanningSubtext');
  if (subtextEl) subtextEl.textContent = scanContent.subtitle;

  // Illustration fallback handling
  const imgEl = container.querySelector('#scanningIllustration');
  const fallbackEl = container.querySelector('#scanningFallback');
  const showFallback = () => {
    if (imgEl) imgEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = 'flex';
  };
  imgEl?.addEventListener('error', showFallback);
  if (imgEl?.complete && imgEl.naturalWidth === 0) {
    showFallback();
  }

  // Render 3-step row
  const stepsCard = container.querySelector('#scanStepsCard');
  function renderSteps(currentStage, isFinished) {
    if (!stepsCard) return;
    stepsCard.textContent = '';

    const stages = ['connect', 'scan', 'analyze'];
    const currentIdx = isFinished ? 3 : stages.indexOf(currentStage);

    scanContent.steps.forEach((step, idx) => {
      if (idx > 0) {
        const divider = document.createElement('div');
        divider.className = 'step-divider';
        divider.setAttribute('aria-hidden', 'true');
        stepsCard.appendChild(divider);
      }

      const item = document.createElement('div');
      item.className = 'step-item';
      item.setAttribute('role', 'listitem');

      let stateClass = 'is-pending';
      if (idx < currentIdx) {
        stateClass = 'is-done';
      } else if (idx === currentIdx) {
        stateClass = 'is-active';
      }
      item.classList.add(stateClass);

      const badge = document.createElement('div');
      badge.className = 'step-badge';
      badge.setAttribute('aria-hidden', 'true');

      if (stateClass === 'is-done' && icons.check) {
        badge.innerHTML = icons.check;
      }

      const label = document.createElement('span');
      label.className = 'step-label';
      label.textContent = step.label;

      item.appendChild(badge);
      item.appendChild(label);
      stepsCard.appendChild(item);
    });
  }

  // Elements
  const trackEl = container.querySelector('#progressBarTrack');
  const fillEl = container.querySelector('#progressFill');
  const percentEl = container.querySelector('#progressPercent');
  const liveEl = container.querySelector('#scanLiveRegion');
  const mainContentEl = container.querySelector('#scanningMainContent');
  const errorContainerEl = container.querySelector('#scanningErrorContainer');

  function updateProgress({ stage, percent }) {
    if (isCancelled) return;
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));

    if (trackEl) trackEl.setAttribute('aria-valuenow', clamped.toString());
    if (fillEl) fillEl.style.width = `${clamped}%`;
    if (percentEl) percentEl.textContent = `${clamped}%`;

    const isComplete = clamped >= 100;
    renderSteps(stage, isComplete);

    if (liveEl) {
      liveEl.textContent = `${stage}: ${clamped}%`;
    }
  }

  function showError(err) {
    if (isCancelled) return;
    if (mainContentEl) mainContentEl.style.display = 'none';
    if (!errorContainerEl) return;

    errorContainerEl.style.display = 'block';
    errorContainerEl.innerHTML = `
      <div class="scan-error-card" role="alert">
        <p class="scan-error-text" id="scanErrorMessage"></p>
        <div class="scan-error-actions">
          <button type="button" class="btn-retry" id="btnRetryScan">${scanContent.error.retryLabel}</button>
          <button type="button" class="btn-back-landing" id="btnBackScan">${scanContent.error.backLabel}</button>
        </div>
      </div>
    `;

    const msgEl = errorContainerEl.querySelector('#scanErrorMessage');
    if (msgEl) {
      msgEl.textContent = err?.message || scanContent.error.defaultMessage;
    }

    errorContainerEl.querySelector('#btnRetryScan')?.addEventListener('click', () => {
      errorContainerEl.style.display = 'none';
      if (mainContentEl) mainContentEl.style.display = 'flex';
      executeScan();
    });

    errorContainerEl.querySelector('#btnBackScan')?.addEventListener('click', () => {
      if (typeof onBack === 'function') onBack();
    });
  }

  async function executeScan() {
    updateProgress({ stage: 'connect', percent: 0 });

    try {
      const result = await dataSource.startScan(t, updateProgress);
      if (isCancelled) return;

      // Hold at 100% for 300ms as required
      updateProgress({ stage: 'analyze', percent: 100 });
      await new Promise((r) => setTimeout(r, scanContent.timing.completionHoldMs));

      if (!isCancelled && typeof onComplete === 'function') {
        onComplete(result);
      }
    } catch (err) {
      showError(err);
    }
  }

  // Start initial steps and scan
  renderSteps('connect', false);
  executeScan();

  return {
    destroy() {
      isCancelled = true;
      imgEl?.removeEventListener('error', showFallback);
    },
  };
}
