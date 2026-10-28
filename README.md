# AI Pulse Web

The web version of AI Pulse: AI news, papers and community chatter from across the web, merged into one ranked feed. No build step, no dependencies — plain HTML, CSS and JavaScript.

## What it pulls in

- **Community** — Hacker News (via the Algolia API), Bluesky voices (Simon Willison, Ethan Mollick, Nathan Lambert and Andrej Karpathy, through Bluesky's free public API) and r/LocalLLaMA, r/MachineLearning, r/artificial, r/OpenAI, r/ClaudeAI and r/singularity.
- **News** — Google News, OpenAI, Google DeepMind, Hugging Face, The Verge, TechCrunch, MIT Tech Review, VentureBeat, The Decoder and Simon Willison.
- **Research** — Hugging Face Daily Papers, and arXiv cs.AI, cs.LG and cs.CL (the long-tail arXiv ones start off).

Stories are de-duplicated across sources, ranked by freshness decayed over time and lifted by community engagement, and the general-audience firehoses are filtered to stories that are actually about AI.

## Running it

Open `index.html` in a browser, or serve the folder with any static file server. There is nothing to build.

The logo lives in `icon.svg` (favicon and header mark source), `icon-mark.svg` (the header mark) and `apple-touch-icon.png` / `icon-1024.png` (the same 1024px raster, for Home Screens — iOS ignores SVG for those). `manifest.webmanifest` makes the site installable as a standalone app.

Home Screen icons are captured when the shortcut is created, so an existing shortcut keeps its old artwork: delete it and use Share → Add to Home Screen again to pick up a new icon.

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. In the repository: Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
3. The site goes live at `https://<owner>.github.io/<repo>/`.

## Updates

The site updates itself: there is nothing to delete or reinstall. A service worker fetches same-origin files from the network first (falling back to its cache offline), so opening the app always runs the newest deploy. A running copy also checks `version.json` on launch, when it returns to the foreground and every five minutes; if the site has moved on, a "A new version of AI Pulse is ready" pill appears with a Reload button.

To ship a change, bump `version` in `version.json` and `APP_VERSION` in `app.js` together and push — GitHub Pages publishes it. Home Screen artwork is the one thing iOS fixes at install time, so a new icon still needs the shortcut removed and added again.

## How fetching works

Browsers can only read responses from servers that allow cross-origin requests, so each source is tried over several paths: a direct request first, then public CORS proxies (AllOrigins, CodeTabs), then [RSS2JSON](https://rss2json.com/), which reads the feed server-side. The app remembers the path each source last succeeded with, tries that first, and gives a service that rate-limits a ten-minute rest. Every request is timed as a whole — including reading the body — so a stalled proxy can't hang a refresh. Reddit posts come from its JSON API when reachable and fall back to its RSS feed otherwise. A source that fails keeps its last stories instead of emptying the feed, and its error shows in the Sources tab.

Some networks (corporate VPNs, some carrier routes) block Reddit and third-party proxies outright. `diagnostics.html` opens a page that tests each feed and proxy from your own browser, so it's easy to see what a given network can reach.

**On X:** there is no free way left to read a timeline. X's API is paid, the Nitter mirrors that used to relay tweets are suspended or bot-walled, and the public embed endpoint is rate-limited. The Bluesky source covers the same ground — its public API is free, needs no key, and the researchers who drive this conversation post there too. To follow whole X accounts you'd need an X API key or an RSS bridge service; adding the handles in `BLUESKY_ACCOUNTS` (app.js) is free and needs nothing.

Your feed, saved stories, read history and source toggles live in `localStorage` on your device. Nothing is sent anywhere.