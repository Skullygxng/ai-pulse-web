# AI Pulse Web

The web version of AI Pulse: AI news, papers and community chatter from across the web, merged into one ranked feed. No build step, no dependencies — plain HTML, CSS and JavaScript.

## What it pulls in

- **Community** — Hacker News (via the Algolia API) and r/LocalLLaMA, r/MachineLearning, r/artificial, r/OpenAI, r/ClaudeAI and r/singularity.
- **News** — Google News, OpenAI, Google DeepMind, Hugging Face, The Verge, TechCrunch, MIT Tech Review, VentureBeat, The Decoder and Simon Willison.
- **Research** — arXiv cs.AI, cs.LG and cs.CL (the long-tail ones start off).

Stories are de-duplicated across sources, ranked by freshness decayed over time and lifted by community engagement, and the general-audience firehoses are filtered to stories that are actually about AI.

## Running it

Open `index.html` in a browser, or serve the folder with any static file server. There is nothing to build.

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. In the repository: Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
3. The site goes live at `https://<owner>.github.io/<repo>/`.

## How fetching works

Browsers can only read responses from servers that allow cross-origin requests. Feeds are first fetched through [RSS2JSON](https://rss2json.com/), which reads them server-side so local network blocks don't apply; if that fails, a direct request and then public CORS proxies (AllOrigins, CodeTabs) are tried, staggered and retried so one busy proxy can't sink the whole refresh. Reddit posts come from its JSON API when reachable and fall back to its RSS feed otherwise. A source that fails keeps its last stories instead of emptying the feed, and its error shows in the Sources tab.

Your feed, saved stories, read history and source toggles live in `localStorage` on your device. Nothing is sent anywhere.