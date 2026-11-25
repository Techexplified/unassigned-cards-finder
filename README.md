# Unassigned Card Finder (Trello Power-Up)

A Trello Power-Up that scans boards to find cards with no assigned members and helps assign them directly from a unified interface.

## Development & Build

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build production bundle:**
   ```bash
   npm run build
   ```

4. **Preview production build locally:**
   ```bash
   npm run preview
   ```

> **Testing Note:** Trello loads Power-Up connector and modal frames inside an iframe on `trello.com` over HTTPS. Trello cannot load `localhost` directly. For testing inside a real Trello board, deploy the project to a public HTTPS host (such as [Vercel](https://vercel.com/)) or use an HTTPS tunnel (such as ngrok).

---

## Setup & Deployment

1. **Environment Variables**:
   - Set `VITE_TRELLO_APP_KEY` in your `.env` file for local development and in your Vercel project environment variables.
   - Note: Vite inlines environment variables prefixed with `VITE_` at build time. Whenever you change `VITE_TRELLO_APP_KEY`, trigger a rebuild and redeploy.

2. **Trello Power-Up Admin Portal Setup**:
   - Navigate to the [Trello Power-Up Admin Portal](https://trello.com/power-ups/admin).
   - Create or select your Power-Up.
   - **Connector URL**: Set this to your deployed site root (e.g. `https://your-powerup.vercel.app/` or `https://your-powerup.vercel.app/index.html`).
   - **Capabilities**: Enable the **Board buttons** capability.
   - **Allowed Origins**: Add your deployed Vercel origin (strictly without a trailing slash, e.g. `https://your-powerup.vercel.app`) to the **Allowed Origins** list in the Power-Up admin portal.
   - *Troubleshooting:* An **"Invalid return_url"** error indicates that the origin requesting authorization does not match the Allowed Origins configured in the Power-Up portal.

---

## Data and Privacy

- **Zero Server Storage:** Nothing is stored by us. There is no backend server, serverless function, database, or external tracker.
- **Client-Side Authorization:** The Trello REST API token is managed securely in the browser by Trello's client library (`p.trellocdn.com/power-up.min.js`). Tokens are never sent to third-party servers and never logged.
- **In-Memory Operations:** All board scanning, card filtering, member selection, and assignment actions execute entirely in-memory within the browser session.
