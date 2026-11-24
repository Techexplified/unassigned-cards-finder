# Unassigned Card Finder (Trello Power-Up)

A Trello Power-Up that scans boards to find cards with no assigned members and helps assign them.

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

## Trello Power-Up Administration

To register and test this Power-Up on Trello:

1. Navigate to the [Trello Power-Up Admin Portal](https://trello.com/power-ups/admin).
2. Click **New Power-Up**.
3. Fill in basic details (Power-Up name, email, author).
4. **Connector URL**: Set this to your deployed site root (e.g. `https://your-powerup.vercel.app/` or `https://your-powerup.vercel.app/index.html`).
5. **Capabilities**: Enable the **Board buttons** capability. This enables the "Unassigned Finder" button on the board header.
6. **API Key & Allowed Origins**:
   - Generate an API Key under the **API Key** section.
   - Set `VITE_TRELLO_APP_KEY=<your_api_key>` in your environment/hosting configuration.
   - When wiring the REST client for member assignments, add your Vercel deployment origin (e.g. `https://your-powerup.vercel.app`) to the **Allowed Origins** list in the Power-Up admin portal so Trello's client REST API authorizes requests.
