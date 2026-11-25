import { appConfig } from './config/appConfig.js';

/* global TrelloPowerUp */

// Initialize Power-Up connector with board-buttons capability
if (typeof window !== 'undefined' && typeof window.TrelloPowerUp !== 'undefined') {
  window.TrelloPowerUp.initialize(
    {
      'board-buttons': function (t) {
        return [
          {
            text: 'Unassigned Finder',
            callback: function (t) {
              return t.modal({
                url: './landing.html',
                height: 600,
                fullscreen: false,
              });
            },
          },
        ];
      },
    },
    {
      appKey: appConfig.appKey,
      appName: appConfig.appName,
      appAuthor: appConfig.appAuthor,
    }
  );
} else {
  console.warn(
    'TrelloPowerUp library not detected. When loaded outside Trello, the connector script remains idle.'
  );
}
