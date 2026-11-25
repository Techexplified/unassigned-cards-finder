import { appConfig } from '../config/appConfig.js';

/**
 * Custom typed error for Trello REST API requests
 */
export class TrelloApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, kind?: 'auth' | 'forbidden' | 'not_found' | 'rate_limit' | 'server' | 'network' | 'unknown', originalError?: any }} options
   */
  constructor(message, { status = 0, kind = 'unknown', originalError = null } = {}) {
    super(message);
    this.name = 'TrelloApiError';
    this.status = status;
    this.kind = kind;
    this.originalError = originalError;
  }
}

/**
 * Maps HTTP status code to error kind
 *
 * @param {number} status
 * @returns {'auth' | 'forbidden' | 'not_found' | 'rate_limit' | 'server' | 'unknown'}
 */
function mapStatusToKind(status) {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  if (status >= 500 && status <= 599) return 'server';
  return 'unknown';
}

/**
 * Sleeps for a specified number of milliseconds
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Thin REST client wrapper for Trello API.
 * Automatically handles query parameter signing (key and token), timeout, and 429 retry backoff.
 * NOTE: Never logs full URLs, tokens, or sensitive API keys.
 *
 * @param {string} path - API endpoint path (e.g. '/members/me')
 * @param {{
 *   method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
 *   params?: Record<string, string | number | boolean>,
 *   body?: any,
 *   t: any
 * }} options
 * @returns {Promise<any>}
 */
export async function request(path, { method = 'GET', params = {}, body = null, t = null } = {}) {
  const appKey = appConfig.appKey;
  if (!appKey) {
    throw new TrelloApiError('App key is not configured', { kind: 'auth' });
  }

  // Retrieve token from Trello Power-Up REST API client
  let token = null;
  if (t && t.getRestApi && typeof t.getRestApi().getToken === 'function') {
    try {
      token = await t.getRestApi().getToken();
    } catch (tokenErr) {
      throw new TrelloApiError('Failed to retrieve Trello REST token', {
        kind: 'auth',
        originalError: tokenErr,
      });
    }
  }

  if (!token) {
    throw new TrelloApiError('User is not authorized with Trello', { kind: 'auth' });
  }

  // Construct query string with key and token
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      queryParams.set(key, String(val));
    }
  });
  queryParams.set('key', appKey);
  queryParams.set('token', token);

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${appConfig.API_BASE}${normalizedPath}?${queryParams.toString()}`;

  const headers = {};
  let reqBody = undefined;

  if (body !== null && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  // Retry configuration for 429 rate limit: 500ms, 1s, 2s (max 3 retries)
  const retryDelays = [500, 1000, 2000];
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), appConfig.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers,
        body: reqBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && attempt < retryDelays.length) {
        const delay = retryDelays[attempt];
        attempt += 1;
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        let errorMsg = `Trello API error (${response.status})`;
        try {
          const errText = await response.text();
          if (errText) errorMsg = errText;
        } catch {
          // ignore text extraction errors
        }

        const kind = mapStatusToKind(response.status);
        throw new TrelloApiError(errorMsg, { status: response.status, kind });
      }

      // Check if response has JSON content
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof TrelloApiError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new TrelloApiError('Request timed out', { kind: 'network', originalError: err });
      }

      throw new TrelloApiError(err.message || 'Network error occurred', {
        kind: 'network',
        originalError: err,
      });
    }
  }
}
