# User analytics: tracker, API and dashboard

A small full-stack app that records `page_view` and `click` events from any web page, stores them in MongoDB, and shows them in a React dashboard (session journeys and a click heatmap).

## Tech stack

| Layer | Choice |
| --- | --- |
| Tracking script | Vanilla JS, no dependencies (`backend/public/tracker.js`) |
| Backend | Node.js 18+, Express, Mongoose |
| Database | MongoDB |
| Dashboard | React 18 + Vite |

## Setup

Prerequisites: Node.js 18+ and a running MongoDB (local, or a free Atlas cluster).

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env      
npm start              
```

**2. Dashboard** (in a second terminal)

```bash
cd dashboard
npm install
npm run dev               
```

**3. Generate some data**

- Open `http://localhost:4000/demo/index.html` and `http://localhost:4000/demo/pricing.html`, click around, and switch between the pages. Or
- run `npm run seed` in `backend/` to insert 25 fake sessions.

Then open the dashboard and use the **Sessions** and **Click heatmap** tabs.

## Adding the tracker to any page

```html
<script src="http://localhost:4000/tracker.js" defer></script>
```

The script finds the API from its own `src`. To send events elsewhere, add `data-endpoint="https://api.example.com/api/events"`.

What it records:

| Field | Notes |
| --- | --- |
| `sessionId` | UUID in `localStorage` (cookie fallback). A new one starts after 30 minutes of inactivity. |
| `type` | `page_view` or `click` |
| `url` | `location.href` |
| `timestamp` | ISO 8601, client clock |
| `x`, `y` | Click position in the viewport (`clientX/Y`) |
| `pageX`, `pageY`, `pageWidth`, `pageHeight` | Click position in the full document, plus document size (used by the heatmap) |
| `viewportWidth`, `viewportHeight`, `target` | Context for each click |

It also tracks single-page-app navigation (`pushState`, `replaceState`, `popstate`) as page views.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/events` | Store events. Body: one event, an array, or `{ "events": [...] }` (max 100). Invalid events are dropped and counted in `rejected`. |
| `GET` | `/api/sessions?limit=50&skip=0` | Sessions with `totalEvents`, `pageViews`, `clicks`, `firstEvent`, `lastEvent`, newest activity first. |
| `GET` | `/api/sessions/:sessionId/events` | All events for a session, ordered by time. |
| `GET` | `/api/pages` | Pages that have data, with view and click counts. |
| `GET` | `/api/heatmap?page=<url>` | Click positions for one page. |

Example:

```bash
curl -X POST localhost:4000/api/events -H 'Content-Type: application/json' \
  -d '{"sessionId":"abc","type":"page_view","url":"http://localhost:4000/demo/index.html","timestamp":"2025-01-01T10:00:00Z"}'
```

## Data model

One flat `events` collection (see `backend/models/Event.js`). Indexes:

- `{ sessionId, timestamp }` for the sessions aggregation and the per-session journey
- `{ type, page }` for heatmap queries
- `{ timestamp: -1 }` for recency queries

## Assumptions and trade-offs

- **Heatmap grouping:** clicks are grouped by `page` = origin + path, so `?utm=…` and `#hash` variants share one heatmap. The full URL is still stored on every event.
- **Heatmap accuracy:** positions are stored against the full document size and drawn as a fraction of page width. Responsive layouts that reflow at different widths will blur together. The dashboard scales to the most common recorded width. A production tool would bucket by viewport width (mobile / tablet / desktop).
- **Page preview:** the heatmap loads the real page in an iframe (with `?cf_preview=1`, which the tracker ignores so previews aren't counted). Sites that send `X-Frame-Options` or a restrictive CSP will not render, so untick "Show page behind clicks" to see a plain grid.
- **Session definition:** a client-side UUID with a 30-minute inactivity timeout. Cross-device or cross-domain identity is out of scope.
- **Client timestamps:** events use the browser clock, which can be wrong. The server also stores `receivedAt`. Ordering uses `timestamp`.
- **Transport:** events are batched (about 1 second) and sent with `sendBeacon` as `text/plain`, which avoids CORS preflight requests and survives page unloads. The server parses it as JSON.
- **Open ingestion endpoint:** there is no auth, rate limiting or bot filtering on `POST /api/events`, which is fine for a demo but not for production. Set `CORS_ORIGINS` to restrict browser origins (this does not stop non-browser clients).
- **Scale limits:** the sessions list uses a `$group` over all events on each request, and the heatmap returns at most the latest 10,000 clicks. For large volumes, precompute a `sessions` collection and aggregate click bins on the server.
- **Not included:** user accounts for the dashboard, tests, scroll/hover tracking, and a hosted deployment.

## Deploying (optional)

- **API:** any Node host (Render, Railway, Fly). Set `MONGODB_URI` (e.g. Atlas) and `CORS_ORIGINS`.
- **Dashboard:** `npm run build` in `dashboard/`, deploy `dist/` to Vercel/Netlify, and set `VITE_API_URL` to the API's URL at build time.
