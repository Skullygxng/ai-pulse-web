# AI Pulse Web

The web version of AI Pulse: AI news, papers and community chatter from across the web, merged into one ranked feed. No build step, no dependencies — plain HTML, CSS and JavaScript.

## What it pulls in

- **Community** — Hacker News (via the Algolia API) and r/LocalLLaMA, r/MachineLearning, r/artificial, r/OpenAI, r/ClaudeAI and r/singularity.
- **News** — Google News, OpenAI, Google DeepMind, Hugging Face, The Verge, TechCrunch, MIT Tech Review, VentureBeat, The Decoder and Simon Willison.
- **Research** — Hugging Face Daily Papers, and arXiv cs.AI, cs.LG and cs.CL (the long-tail arXiv ones start off).

Stories are de-duplicated across sources, ranked by freshness decayed over time and lifted by community engagement, and the general-audience firehoses are filtered to stories that are actually about AI.

## Running it

Open `index.html` in a browser, or serve the folder with any static file server. There is nothing to build.

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. In the repository: Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
3. The site goes live at `https://<owner>.github.io/<repo>/`.

## How fetching works

Browsers can only read responses from servers that allow cross-origin requests, so each source is tried over several paths: a direct request first, then public CORS proxies (AllOrigins, CodeTabs), then [RSS2JSON](https://rss2json.com/), which reads the feed server-side. The app remembers the path each source last succeeded with, tries that first, and gives a service that rate-limits a ten-minute rest. Every request is timed as a whole — including reading the body — so a stalled proxy can't hang a refresh. Reddit posts come from its JSON API when reachable and fall back to its RSS feed otherwise. A source that fails keeps its last stories instead of emptying the feed, and its error shows in the Sources tab.

Some networks (corporate VPNs, some carrier routes) block Reddit and third-party proxies outright. `diagnostics.html` opens a page that tests each feed and proxy from your own browser, so it's easy to see what a given network can reach.

Your feed, saved stories, read history and source toggles live in `localStorage` on your device. Nothing is sent anywhere.