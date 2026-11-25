import { landingContent } from '../../config/landingContent.js';
import { icons } from '../../ui/icons.js';

/**
 * Mounts the landing screen view into the given container.
 *
 * @param {HTMLElement} container - The container element to mount into
 * @param {{ onStartScan: () => void }} handlers
 * @returns {{ destroy: () => void }}
 */
export function mountLandingView(container, { onStartScan }) {
  container.innerHTML = `
    <div class="landing-view">
      <!-- Left Column: Illustration -->
      <section class="landing-illustration-col" aria-label="Visual illustration">
        <div class="landing-illustration-wrapper">
          <img
            id="landingIllustration"
            src="./assets/landing-illustration.png"
            alt="Illustration of Trello board cards and unassigned member card search"
            class="landing-illustration"
          />
          <div
            id="illustrationFallback"
            class="illustration-fallback"
            role="img"
            aria-label="Illustration placeholder"
            style="display: none;"
          >
            <span class="fallback-title">Illustration Area</span>
            <span class="fallback-desc">public/assets/landing-illustration.png</span>
          </div>
        </div>
      </section>

      <!-- Right Column: Overview & CTA -->
      <section class="landing-content-col" aria-label="Power-Up overview">
        <h1 class="landing-title" id="landingTitle"></h1>
        <p class="landing-subtitle" id="landingSubtitle"></p>

        <ul class="feature-list" id="featureList" role="list"></ul>

        <div class="landing-cta-wrapper">
          <button
            type="button"
            class="btn-scan"
            id="btnScan"
            aria-label="Scan Board for unassigned cards"
          >
            <span class="btn-icon" id="btnIconStart" aria-hidden="true"></span>
            <span class="btn-label" id="btnLabel"></span>
            <span class="btn-icon" id="btnIconEnd" aria-hidden="true"></span>
          </button>
        </div>
      </section>
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

  // Populate data-driven content safely via textContent
  const titleEl = container.querySelector('#landingTitle');
  if (titleEl) {
    titleEl.textContent = landingContent.title;
  }

  const subtitleEl = container.querySelector('#landingSubtitle');
  if (subtitleEl) {
    subtitleEl.textContent = landingContent.subtitle;
  }

  // Feature rows
  const featureListEl = container.querySelector('#featureList');
  if (featureListEl && Array.isArray(landingContent.features)) {
    landingContent.features.forEach((feature) => {
      const li = document.createElement('li');
      li.className = 'feature-item';

      const iconTile = document.createElement('div');
      iconTile.className = 'feature-icon-tile';
      iconTile.setAttribute('aria-hidden', 'true');
      if (icons[feature.icon]) {
        iconTile.innerHTML = icons[feature.icon];
      }

      const info = document.createElement('div');
      info.className = 'feature-info';

      const title = document.createElement('div');
      title.className = 'feature-title';
      title.textContent = feature.title;

      const desc = document.createElement('p');
      desc.className = 'feature-description';
      desc.textContent = feature.description;

      info.appendChild(title);
      info.appendChild(desc);

      li.appendChild(iconTile);
      li.appendChild(info);
      featureListEl.appendChild(li);
    });
  }

  // CTA button
  const btnScan = container.querySelector('#btnScan');
  const btnIconStart = container.querySelector('#btnIconStart');
  const btnIconEnd = container.querySelector('#btnIconEnd');
  const btnLabel = container.querySelector('#btnLabel');

  if (btnIconStart && icons.search) btnIconStart.innerHTML = icons.search;
  if (btnIconEnd && icons.arrowRight) btnIconEnd.innerHTML = icons.arrowRight;
  if (btnLabel) btnLabel.textContent = landingContent.cta.label;

  const handleScanClick = () => {
    if (typeof onStartScan === 'function') {
      onStartScan();
    }
  };

  btnScan?.addEventListener('click', handleScanClick);

  // Illustration fallback handling
  const imgEl = container.querySelector('#landingIllustration');
  const fallbackEl = container.querySelector('#illustrationFallback');
  const showFallback = () => {
    if (imgEl) imgEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = 'flex';
  };

  imgEl?.addEventListener('error', showFallback);
  if (imgEl?.complete && imgEl.naturalWidth === 0) {
    showFallback();
  }

  return {
    destroy() {
      btnScan?.removeEventListener('click', handleScanClick);
      imgEl?.removeEventListener('error', showFallback);
    },
  };
}
