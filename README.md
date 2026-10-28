# AI Pulse Web

The web version of AI Pulse: AI news, papers and community chatter from across the web, merged into one ranked feed. No build step, no dependencies — plain HTML, CSS and JavaScript.

## What it pulls in

- **Community** — Hacker News (via the Algolia API), Bluesky voices (Simon Willison, Ethan Mollick, Nathan Lambert and Andrej Karpathy, through Bluesky's free public API) and r/LocalLLaMA, r/MachineLearning, r/artificial, r/OpenAI, r/ClaudeAI and r/singularity.
- **News** — Google News, OpenAI, Google DeepMind, Hugging Face, The Verge, TechCrunch, MIT Tech Review, VentureBeat, The Decoder, Simon Willison, Google Research, Microsoft Research, Import AI, Interconnects, Latent Space and One Useful Thing.
- **Underground** — LessWrong, The Gradient and Lobsters · ai, for the forums and long-form writing the mainstream never covers.
- **New releases** — Hugging Face's trending models API, which surfaces every open model launch within hours.
- **Research** — Hugging Face Daily Papers, and arXiv cs.AI, cs.LG and cs.CL (the long-tail arXiv ones start off).

Stories are de-duplicated across sources, ranked by freshness decayed over time and lifted by community engagement. Hacker News is fetched broadly and filtered to AI by topic keywords rather than by asking the API for the word "AI", so stories that phrase it differently still land in the feed. The list renders a screenful at a time and extends as you scroll, and pulling down at the top refreshes.

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

Browsers can only read responses from servers that allow cross-origin requests, so each source is tried over several paths: a direct request first, then public CORS proxies (AllOrigins, CodeTabs), then [RSS2JSON](https://rss2json.com/), which reads the feed server-side. A feed that still refuses is finally read through the [Jina reader](https://r.jina.ai/), whose rendered page is parsed back into headlines and dates. The app remembers the path each source last succeeded with, tries that first, and gives a service that rate-limits a ten-minute rest. Every request is timed as a whole — including reading the body — so a stalled proxy can't hang a refresh. Reddit posts come from its JSON API when reachable and fall back to its RSS feed otherwise. A source that fails keeps its last stories instead of emptying the feed, and its error shows in the Sources tab.

Some networks (corporate VPNs, some carrier routes) block Reddit and third-party proxies outright. `diagnostics.html` opens a page that tests each feed and proxy from your own browser, so it's easy to see what a given network can reach.

**On X:** the free routes are gone — X's API is paid, the Nitter mirrors are suspended or bot-walled, RSSHub's Twitter bridge was removed and the public embed endpoint rate-limits. Two things still work and both are in the app: an **X (scraped)** source that renders public profiles through the free [Jina reader](https://r.jina.ai/) (best effort — headlines only, no metrics, and it shows an error if X refuses), and **Bluesky voices**, whose public API is free, key-less and carries the same conversation. Account handles for both live in `X_ACCOUNTS` and `BLUESKY_ACCOUNTS` in app.js.

Your feed, saved stories, read history and source toggles live in `localStorage` on your device. Nothing is sent anywhere.

## Known limits

- **It depends on other people's servers.** Feeds are read directly, through public CORS proxies, through RSS2JSON or through the Jina reader, in that order. When all four are blocked for a given host — some corporate VPNs and carrier routes do this to Reddit in particular — that source reports an error and keeps its previous stories. `diagnostics.html` shows what your network can reach.
- **Scraped sources are best effort.** X posts come from a rendered profile page, so they carry no like or comment counts and their links open the account rather than the individual post.
- **The Home Screen icon is fixed at install.** Everything else updates itself.