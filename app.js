'use strict';

/*
 AI Pulse Web — one ranked feed of AI news, papers and community chatter.
 No build step, no dependencies. Fetches the same sources as the iOS app,
 merges and de-duplicates them, and keeps everything in localStorage.
*/

// MARK: - Source catalog (mirrors the iOS app's SourceCatalog)

const SOURCES = [
  { id: 'hn', name: 'Hacker News', kind: 'hn', category: 'community', handle: 'news.ycombinator.com', endpoint: '' },
  { id: 'reddit-localllama', name: 'r/LocalLLaMA', kind: 'reddit', category: 'community', handle: 'reddit.com/r/LocalLLaMA', endpoint: 'LocalLLaMA' },
  { id: 'reddit-ml', name: 'r/MachineLearning', kind: 'reddit', category: 'community', handle: 'reddit.com/r/MachineLearning', endpoint: 'MachineLearning' },
  { id: 'reddit-artificial', name: 'r/artificial', kind: 'reddit', category: 'community', handle: 'reddit.com/r/artificial', endpoint: 'artificial' },
  { id: 'reddit-openai', name: 'r/OpenAI', kind: 'reddit', category: 'community', handle: 'reddit.com/r/OpenAI', endpoint: 'OpenAI' },
  { id: 'reddit-claudeai', name: 'r/ClaudeAI', kind: 'reddit', category: 'community', handle: 'reddit.com/r/ClaudeAI', endpoint: 'ClaudeAI' },
  { id: 'reddit-singularity', name: 'r/singularity', kind: 'reddit', category: 'community', handle: 'reddit.com/r/singularity', endpoint: 'singularity' },
  { id: 'google-news', name: 'Google News', kind: 'rss', category: 'news', handle: 'news.google.com', endpoint: 'https://news.google.com/rss/search?q=%22artificial+intelligence%22+OR+LLM+OR+%22open+source+AI%22+when%3A2d&hl=en-US&gl=US&ceid=US:en', stripsOutletSuffix: true },
  { id: 'openai', name: 'OpenAI', kind: 'rss', category: 'news', handle: 'openai.com', endpoint: 'https://openai.com/news/rss.xml' },
  { id: 'deepmind', name: 'Google DeepMind', kind: 'rss', category: 'news', handle: 'deepmind.google', endpoint: 'https://deepmind.google/blog/rss.xml' },
  { id: 'huggingface', name: 'Hugging Face', kind: 'rss', category: 'news', handle: 'huggingface.co', endpoint: 'https://huggingface.co/blog/feed.xml' },
  { id: 'verge-ai', name: 'The Verge', kind: 'rss', category: 'news', handle: 'theverge.com', endpoint: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'techcrunch-ai', name: 'TechCrunch', kind: 'rss', category: 'news', handle: 'techcrunch.com', endpoint: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'mit-tr-ai', name: 'MIT Tech Review', kind: 'rss', category: 'news', handle: 'technologyreview.com', endpoint: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { id: 'venturebeat-ai', name: 'VentureBeat', kind: 'rss', category: 'news', handle: 'venturebeat.com', endpoint: 'https://venturebeat.com/category/ai/feed/' },
  { id: 'the-decoder', name: 'The Decoder', kind: 'rss', category: 'news', handle: 'the-decoder.com', endpoint: 'https://the-decoder.com/feed/' },
  { id: 'simon-willison', name: 'Simon Willison', kind: 'rss', category: 'news', handle: 'simonwillison.net', endpoint: 'https://simonwillison.net/atom/everything/' },
  { id: 'arxiv-ai', name: 'arXiv cs.AI', kind: 'rss', category: 'research', handle: 'arxiv.org', endpoint: 'https://export.arxiv.org/rss/cs.AI' },
  { id: 'arxiv-lg', name: 'arXiv cs.LG', kind: 'rss', category: 'research', handle: 'arxiv.org', endpoint: 'https://export.arxiv.org/rss/cs.LG' },
  { id: 'arxiv-cl', name: 'arXiv cs.CL', kind: 'rss', category: 'research', handle: 'arxiv.org', endpoint: 'https://export.arxiv.org/rss/cs.CL' }
];

const CATEGORIES = ['community', 'news', 'research'];
const CATEGORY_TITLES = { community: 'Community', news: 'News', research: 'Research' };
const PROXIES = [
  url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  url => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url)
];

const delay = ms => new Promise(function (resolve) { setTimeout(resolve, ms); });

/// Browsers give unhelpful names to a blocked or dropped request.
function friendlyError(err) {
  const message = (err && err.message) || '';
  if (message === 'Load failed' || message === 'Failed to fetch' || message.indexOf('NetworkError') === 0) return 'Network error';
  return message || 'Could not load';
}

function defaultEnabled() {
  // The two long-tail arXiv firehoses start off, like the iOS app.
  return new Set(SOURCES.map(s => s.id).filter(id => id !== 'arxiv-lg' && id !== 'arxiv-cl'));
}

// MARK: - Icons

function ic(inner) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}

const ICON = {
  hn: ic('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
  reddit: ic('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
  rss: ic('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  bookmark: ic('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  arrowUp: ic('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
  comment: ic('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  link: ic('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  refresh: ic('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'),
  search: ic('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>')
};

// MARK: - Text helpers

const SCRATCH = document.createElement('div');

function decodeEntities(str) {
  if (!str) return '';
  SCRATCH.innerHTML = str;
  return SCRATCH.textContent.trim();
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

/// FNV-1a (32-bit), so ids survive across sessions like the iOS app's StableHash.
function stableHash(string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < string.length; i++) {
    hash ^= string.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16);
}

/// "now", "12m", "4h", "3d", or "Mar 4" — the compact age shown on cards.
function pulseRelative(date) {
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/// 987, 1.2k, 18k, 1.4m
function compactCount(value) {
  if (value < 1000) return String(value);
  if (value < 10000) return (value / 1000).toFixed(1) + 'k';
  if (value < 1000000) return Math.round(value / 1000) + 'k';
  return (value / 1000000).toFixed(1) + 'm';
}

// MARK: - AI relevance (port of the iOS app's AITopicFilter)

const AI_PHRASES = [
  'artificial intelligence', 'machine learning', 'deep learning', 'language model',
  'neural network', 'hugging face', 'open source model', 'open-weight', 'open weight',
  'context window', 'fine-tune', 'fine tuned', 'reinforcement learning', 'diffusion model',
  'text-to-image', 'reasoning model', 'mixture of experts', 'ai safety', 'alignment research',
  'training run', 'training cluster', 'foundation model', 'synthetic data', 'model weights',
  'inference cost', 'sam altman', 'yann lecun', 'ai agent', 'ai agents', 'ai model',
  'ai models', 'ai startup', 'ai company', 'ai chip', 'ai chips'
];

const AI_KEYWORDS = new Set([
  'ai', 'agi', 'llm', 'llms', 'gpt', 'gpt4', 'gpt5', 'chatgpt', 'openai', 'anthropic',
  'claude', 'gemini', 'deepmind', 'llama', 'mistral', 'deepseek', 'qwen', 'grok', 'xai',
  'perplexity', 'midjourney', 'copilot', 'ollama', 'vllm', 'transformer', 'transformers',
  'diffusion', 'inference', 'embedding', 'embeddings', 'dataset', 'datasets', 'benchmark',
  'benchmarks', 'superintelligence', 'quantization', 'quantized', 'multimodal', 'tokenizer',
  'finetune', 'finetuning', 'gpu', 'gpus', 'neural', 'langchain', 'rag', 'huggingface',
  'karpathy', 'sora', 'nvidia'
]);

function isAIRelevant(title) {
  const lower = (title || '').toLowerCase();
  for (const phrase of AI_PHRASES) {
    if (lower.includes(phrase)) return true;
  }
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some(t => AI_KEYWORDS.has(t));
}

// MARK: - Networking

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms || 12000);
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

/// Direct first; a CORS-blocked or failed request falls back through public proxies.
async function fetchText(url) {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.text();
  } catch (directError) {
    let lastError = directError;
    for (const makeURL of PROXIES) {
      try {
        const response = await fetchWithTimeout(makeURL(url), 20000);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return await response.text();
      } catch (proxyError) {
        lastError = proxyError;
      }
    }
    throw lastError;
  }
}

async function fetchJSON(url) {
  return JSON.parse(await fetchText(url));
}

// MARK: - Source loaders

async function loadHN() {
  const data = await fetchJSON('https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=100');
  const hits = (data.hits || []).filter(h => h.title && isAIRelevant(h.title)).slice(0, 60);
  return hits.map(h => {
    const discussion = 'https://news.ycombinator.com/item?id=' + h.objectID;
    const article = h.url && !h.url.startsWith('https://news.ycombinator.com') ? h.url : null;
    return {
      id: 'hn-' + h.objectID,
      title: decodeEntities(h.title),
      summary: '',
      articleURL: article,
      discussionURL: discussion,
      sourceID: 'hn',
      sourceName: 'Hacker News',
      category: 'community',
      kind: 'hn',
      publishedAt: new Date(h.created_at),
      points: h.points || 0,
      commentCount: h.num_comments || 0,
      author: h.author || null
    };
  });
}

const REDDIT_SELF = /^https?:\/\/([a-z0-9-]+\.)?(reddit\.com|redd\.it)/i;

async function loadRedditJSON(sub) {
  const data = await fetchJSON('https://www.reddit.com/r/' + sub + '/top.json?t=day&limit=40&raw_json=1');
  const posts = ((data.data && data.data.children) || []).map(c => c.data).filter(p => p && !p.stickied && p.title);
  return posts.map(p => {
    const permalink = 'https://www.reddit.com' + p.permalink;
    const article = (!p.is_self && p.url && !REDDIT_SELF.test(p.url)) ? p.url : null;
    const summary = (p.selftext || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    return {
      id: 'reddit-' + p.id,
      title: decodeEntities(p.title),
      summary: summary,
      articleURL: article,
      discussionURL: permalink,
      sourceID: 'reddit-' + sub.toLowerCase(),
      sourceName: 'r/' + sub,
      category: 'community',
      kind: 'reddit',
      publishedAt: new Date(p.created_utc * 1000),
      points: p.ups || 0,
      commentCount: p.num_comments || 0,
      author: p.author || null
    };
  });
}

/// RSS2JSON reads feeds on its own servers, so a local network block or a
/// dead proxy can't stop it. Free tier, no key.
async function fetchViaRSS2JSON(url) {
  const response = await fetchWithTimeout('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url), 20000);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data = await response.json();
  if (data.status !== 'ok' || !data.feed) throw new Error(data.message || 'Feed rejected');
  return data;
}

function stripHtmlish(html) {
  SCRATCH.innerHTML = html || '';
  return SCRATCH.textContent.replace(/\s+/g, ' ').trim().slice(0, 240);
}

function itemsFromRSS2JSON(data, source) {
  return (data.items || []).slice(0, 40).map(item => {
    let published = item.pubDate ? new Date(item.pubDate) : new Date();
    if (isNaN(published.getTime())) published = new Date();
    let title = decodeEntities(item.title || '');
    if (source.stripsOutletSuffix) title = title.replace(/\s+-\s+[^-]+$/, '');
    return {
      id: source.id + '-' + stableHash(item.link || title),
      title: title,
      summary: stripHtmlish(item.description || item.content),
      articleURL: /^https?:\/\//i.test(item.link || '') ? item.link : null,
      discussionURL: null,
      sourceID: source.id,
      sourceName: source.name,
      category: source.category,
      kind: source.kind,
      publishedAt: published,
      points: 0,
      commentCount: 0,
      author: item.author || null
    };
  }).filter(item => item.title);
}

function redditSource(sub) {
  return { id: 'reddit-' + sub.toLowerCase(), name: 'r/' + sub, kind: 'reddit', category: 'community' };
}

/// Reddit's JSON API from the browser works on most networks; where it is
/// blocked, its RSS feed fetched server-side still gets the posts through.
async function loadRedditRSS(sub) {
  const data = await fetchViaRSS2JSON('https://www.reddit.com/r/' + sub + '/top.rss?t=day');
  return itemsFromRSS2JSON(data, redditSource(sub));
}

async function loadReddit(sub) {
  try {
    return await loadRedditJSON(sub);
  } catch (jsonError) {
    return await loadRedditRSS(sub);
  }
}

function childByLocalName(node, names) {
  if (!node) return null;
  const all = node.getElementsByTagName('*');
  for (const el of all) {
    if (names.indexOf(el.localName) !== -1) return el;
  }
  return null;
}

function parseFeed(xmlText, source) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('Could not parse feed');

  const entries = Array.from(doc.querySelectorAll('item')).concat(Array.from(doc.querySelectorAll('entry')));
  return entries.slice(0, 40).map(entry => {
    const rawTitle = childByLocalName(entry, ['title']);
    const title = decodeEntities(rawTitle ? rawTitle.textContent : '');

    // RSS puts the address in the link text; Atom puts it in an href.
    let link = '';
    const links = Array.from(entry.getElementsByTagName('link'));
    for (const l of links) {
      const rel = l.getAttribute('rel');
      const href = l.getAttribute('href');
      if (href && (rel === 'alternate' || !rel)) { link = href; break; }
      if (!href && l.textContent.trim()) { link = l.textContent.trim(); break; }
    }

    const rawSummary = childByLocalName(entry, ['description', 'summary', 'content', 'encoded']);
    let summary = rawSummary ? decodeEntities(rawSummary.textContent) : '';
    summary = summary.replace(/\s+/g, ' ').trim().slice(0, 240);

    const rawDate = childByLocalName(entry, ['pubDate', 'updated', 'published', 'date']);
    let published = rawDate ? new Date(rawDate.textContent.trim()) : new Date();
    if (isNaN(published.getTime())) published = new Date();

    if (source.stripsOutletSuffix) title = title.replace(/\s+-\s+[^-]+$/, '');

    const rawAuthor = childByLocalName(entry, ['name', 'creator', 'author']);
    const author = rawAuthor ? decodeEntities(rawAuthor.textContent) : null;

    return {
      id: source.id + '-' + stableHash(link || title),
      title: title,
      summary: summary,
      articleURL: /^https?:\/\//i.test(link) ? link : null,
      discussionURL: null,
      sourceID: source.id,
      sourceName: source.name,
      category: source.category,
      kind: 'rss',
      publishedAt: published,
      points: 0,
      commentCount: 0,
      author: author
    };
  }).filter(item => item.title);
}

async function loadRSS(source) {
  try {
    const data = await fetchViaRSS2JSON(source.endpoint);
    return itemsFromRSS2JSON(data, source);
  } catch (rss2jsonError) {
    return parseFeed(await fetchText(source.endpoint), source);
  }
}

async function loadSource(source) {
  if (source.kind === 'hn') return loadHN();
  if (source.kind === 'reddit') return loadReddit(source.endpoint);
  return loadRSS(source);
}

// MARK: - Scoring, dedupe, matching

/// Freshness decayed over time, lifted by community engagement.
/// Blogs have no votes, so they rank on freshness alone.
function score(item, now) {
  const hours = Math.max(0.5, (now.getTime() - item.publishedAt.getTime()) / 3600000);
  const freshness = 1 / Math.pow(hours, 0.55);
  const signal = Math.log10(Math.max(0, item.points) + Math.max(0, item.commentCount) * 1.5 + 10) / 2;
  return freshness * (1 + signal * 0.8);
}

function engagement(item) {
  return (item.points || 0) + (item.commentCount || 0) * 1.5;
}

/// Two sources pointing at the same article should not both appear.
function dedupeKey(item) {
  if (item.articleURL) {
    try {
      const url = new URL(item.articleURL);
      let path = url.pathname.toLowerCase();
      if (path.endsWith('/')) path = path.slice(0, -1);
      return url.host.toLowerCase() + path;
    } catch (e) { /* fall through */ }
  }
  return item.id;
}

/// The same story often arrives twice — once from an aggregator with the
/// outlet appended, once straight from the source.
function titleKey(item) {
  return item.title.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 90);
}

function matchesQuery(item, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return item.title.toLowerCase().includes(needle) ||
    (item.summary || '').toLowerCase().includes(needle) ||
    item.sourceName.toLowerCase().includes(needle) ||
    (item.author || '').toLowerCase().includes(needle);
}

// MARK: - State

const STORAGE_KEY = 'ai-pulse-web-state-v1';
let memoryFallback = null;

function saveRaw(value) {
  try { localStorage.setItem(STORAGE_KEY, value); }
  catch (e) { memoryFallback = value; }
}

function loadRaw() {
  try { return localStorage.getItem(STORAGE_KEY); }
  catch (e) { return memoryFallback; }
}

const state = {
  items: [],
  saved: [],
  savedIDs: new Set(),
  readIDs: new Set(),
  enabled: defaultEnabled(),
  status: {},
  lastRefreshed: null,
  isRefreshing: false,
  filter: 'all',
  sort: 'forYou',
  query: '',
  view: 'feed'
};

function persist() {
  const snapshot = {
    items: state.items.slice(0, 300).map(item => Object.assign({}, item, { publishedAt: item.publishedAt.toISOString() })),
    saved: state.saved.map(item => Object.assign({}, item, { publishedAt: item.publishedAt.toISOString() })),
    readIDs: Array.from(state.readIDs),
    enabled: Array.from(state.enabled),
    status: state.status,
    lastRefreshed: state.lastRefreshed ? state.lastRefreshed.toISOString() : null
  };
  saveRaw(JSON.stringify(snapshot));
}

function restore() {
  const raw = loadRaw();
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.items = (data.items || []).map(unpersistItem);
    state.saved = (data.saved || []).map(unpersistItem);
    state.savedIDs = new Set(state.saved.map(item => item.id));
    state.readIDs = new Set(data.readIDs || []);
    if (data.enabled && data.enabled.length) state.enabled = new Set(data.enabled);
    state.status = data.status || {};
    state.lastRefreshed = data.lastRefreshed ? new Date(data.lastRefreshed) : null;
  } catch (e) { /* a broken snapshot just means a fresh start */ }
}

function unpersistItem(raw) {
  return Object.assign({}, raw, { publishedAt: new Date(raw.publishedAt) });
}

function pruneRead() {
  const live = new Set(state.items.map(item => item.id));
  for (const id of state.savedIDs) live.add(id);
  for (const id of Array.from(state.readIDs)) {
    if (!live.has(id)) state.readIDs.delete(id);
  }
}

// MARK: - Refresh

async function refresh() {
  if (state.isRefreshing) return;
  state.isRefreshing = true;
  renderHeader();
  renderFeed();

  const sources = SOURCES.filter(s => state.enabled.has(s.id));
  const previousBySource = {};
  for (const item of state.items) {
    (previousBySource[item.sourceID] = previousBySource[item.sourceID] || []).push(item);
  }

  // Stagger the sources so 18 requests don't land on the proxies at once,
  // and give a source that fails one second try.
  const results = await Promise.all(sources.map(async (source, index) => {
    await delay(index * 350);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return { id: source.id, items: await loadSource(source), error: null };
      } catch (err) {
        if (attempt === 1) return { id: source.id, items: [], error: friendlyError(err) };
        await delay(2000);
      }
    }
  }));

  const now = new Date();
  let merged = [];
  const seenAddresses = new Set();
  const seenTitles = new Set();
  const refreshedStatus = {};

  for (const source of sources) {
    const result = results.find(r => r.id === source.id);
    let sourceItems;
    if (result && !result.error) {
      sourceItems = result.items;
      refreshedStatus[source.id] = { count: result.items.length, error: null, updatedAt: now.toISOString() };
    } else {
      // A source that fails keeps what it had, so a flaky request never empties the feed.
      sourceItems = previousBySource[source.id] || [];
      refreshedStatus[source.id] = {
        count: sourceItems.length,
        error: (result && result.error) || 'Could not load',
        updatedAt: (state.status[source.id] && state.status[source.id].updatedAt) || null
      };
    }
    for (const item of sourceItems) {
      const address = dedupeKey(item);
      const tKey = titleKey(item);
      if (seenAddresses.has(address) || seenTitles.has(tKey)) continue;
      seenAddresses.add(address);
      seenTitles.add(tKey);
      merged.push(item);
    }
  }

  merged.sort((a, b) => score(b, now) - score(a, now));

  state.items = merged.slice(0, 600);
  state.status = refreshedStatus;
  state.lastRefreshed = now;
  state.isRefreshing = false;
  pruneRead();
  persist();
  renderAll();
}

async function bootstrap() {
  const stale = !state.lastRefreshed || (Date.now() - state.lastRefreshed.getTime()) > 10 * 60 * 1000;
  if (state.items.length === 0 || stale) await refresh();
}

// MARK: - Actions

function markRead(id) {
  if (state.readIDs.has(id)) return;
  state.readIDs.add(id);
  persist();
}

function markAllRead() {
  for (const item of state.items) state.readIDs.add(item.id);
  persist();
  renderAll();
}

function toggleSaved(id) {
  if (state.savedIDs.has(id)) {
    state.saved = state.saved.filter(item => item.id !== id);
    state.savedIDs.delete(id);
  } else {
    const item = state.items.find(i => i.id === id);
    if (item) {
      state.saved.unshift(item);
      state.savedIDs.add(id);
    }
  }
  persist();
  renderAll();
}

function setSourceEnabled(sourceID, isEnabled) {
  if (isEnabled) {
    state.enabled.add(sourceID);
  } else {
    state.enabled.delete(sourceID);
    state.items = state.items.filter(item => item.sourceID !== sourceID);
    const previous = state.status[sourceID] || {};
    state.status[sourceID] = { count: 0, error: null, updatedAt: previous.updatedAt || null };
  }
  persist();
  renderAll();
}

// MARK: - Rendering

const feedList = document.getElementById('feed-list');
const savedList = document.getElementById('saved-list');
const sourcesList = document.getElementById('sources-list');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const updatedLine = document.getElementById('updated-line');
const savedCount = document.getElementById('saved-count');

function visibleItems() {
  const items = state.items.filter(item => {
    if (state.filter !== 'all' && item.category !== state.filter) return false;
    return matchesQuery(item, state.query);
  });
  if (state.sort === 'latest') {
    items.sort((a, b) => b.publishedAt - a.publishedAt);
  } else if (state.sort === 'top') {
    items.sort((a, b) => engagement(b) - engagement(a));
  } else {
    const now = new Date();
    items.sort((a, b) => score(b, now) - score(a, now));
  }
  return items;
}

function cardHTML(item, isSavedCard) {
  const isRead = state.readIDs.has(item.id);
  const isSaved = state.savedIDs.has(item.id);
  const openURL = item.articleURL || item.discussionURL || '';
  const metrics = [];
  if (item.points > 0) metrics.push('<span class="metric">' + ICON.arrowUp + compactCount(item.points) + '</span>');
  if (item.commentCount > 0) metrics.push('<span class="metric">' + ICON.comment + compactCount(item.commentCount) + '</span>');
  const discussion = item.discussionURL
    ? '<a class="discussion-ctl" href="' + escapeAttr(item.discussionURL) + '" target="_blank" rel="noopener">' + ICON.link + 'Discussion</a>'
    : '';
  return (
    '<article class="card' + (isRead ? ' is-read' : '') + '" data-id="' + escapeAttr(item.id) + '" data-url="' + escapeAttr(openURL) + '">' +
      '<div class="card-head">' +
        '<span class="glyph glyph-' + item.category + '">' + (ICON[item.kind] || ICON.rss) + '</span>' +
        '<span class="card-source">' + escapeHtml(item.sourceName) + '</span>' +
        '<span class="dot-sep">·</span>' +
        '<span class="card-age">' + pulseRelative(item.publishedAt) + '</span>' +
        (isRead ? '' : '<span class="unread-dot"></span>') +
        '<button class="save-ctl' + (isSaved ? ' is-saved' : '') + '" data-id="' + escapeAttr(item.id) + '" title="' + (isSaved ? 'Remove from saved' : 'Save') + '" aria-label="' + (isSaved ? 'Remove from saved' : 'Save') + '">' + ICON.bookmark + '</button>' +
      '</div>' +
      '<h3 class="card-title"><a href="' + escapeAttr(openURL || '#') + '" target="_blank" rel="noopener">' + escapeHtml(item.title) + '</a></h3>' +
      (item.summary ? '<p class="card-summary">' + escapeHtml(item.summary) + '</p>' : '') +
      '<div class="card-meta">' +
        '<span class="card-cat cat-' + item.category + '">' + CATEGORY_TITLES[item.category] + '</span>' +
        metrics.join('') + discussion +
      '</div>' +
    '</article>'
  );
}

function renderFeed() {
  if (state.isRefreshing && state.items.length === 0) {
    feedList.innerHTML = Array.from({ length: 8 }, (_, i) =>
      '<div class="skeleton is-on"><div class="sk-line"></div><div class="sk-line sk-title"></div><div class="sk-line"></div></div>'
    ).join('');
    return;
  }
  const items = visibleItems();
  if (items.length === 0) {
    feedList.innerHTML =
      '<div class="empty"><h2>' +
      (state.query ? 'No matches' : 'Nothing here yet') +
      '</h2><p>' +
      (state.query ? 'Try a different search.' : 'Tap refresh, or turn more sources on in the Sources tab.') +
      '</p></div>';
    return;
  }
  feedList.innerHTML = items.map(item => cardHTML(item, false)).join('');
}

function renderSaved() {
  if (state.saved.length === 0) {
    savedList.innerHTML = '<div class="empty"><h2>No saved stories</h2><p>Tap the bookmark on any card to keep it here.</p></div>';
    return;
  }
  savedList.innerHTML = state.saved.map(item => cardHTML(item, true)).join('');
}

function renderSources() {
  sourcesList.innerHTML = CATEGORIES.map(category => {
    const rows = SOURCES.filter(s => s.category === category).map(source => {
      const status = state.status[source.id] || {};
      const on = state.enabled.has(source.id);
      const updated = status.updatedAt ? new Date(status.updatedAt) : null;
      let info;
      if (!on) info = 'Off';
      else if (status.error) info = 'Error: ' + status.error;
      else if (updated) {
        const age = pulseRelative(updated);
        info = (status.count || 0) + ' stories · ' + (age === 'now' ? 'just now' : age + ' ago');
      }
      else info = 'Not refreshed yet';
      return (
        '<div class="source-row' + (on ? '' : ' is-off') + '">' +
          '<div class="source-info">' +
            '<div class="source-name"><span class="glyph glyph-' + category + '">' + (ICON[source.kind] || ICON.rss) + '</span>' + escapeHtml(source.name) + '</div>' +
            '<div class="source-sub">' + escapeHtml(source.handle) + ' · <span class="source-status' + (on && status.error ? ' has-error' : '') + '">' + info + '</span></div>' +
          '</div>' +
          '<label class="switch"><input type="checkbox" data-source="' + escapeAttr(source.id) + '"' + (on ? ' checked' : '') + '><span class="knob"></span></label>' +
        '</div>'
      );
    }).join('');
    return '<h2 class="source-group">' + CATEGORY_TITLES[category] + '</h2>' + rows;
  }).join('');
}

function renderHeader() {
  refreshBtn.classList.toggle('is-busy', state.isRefreshing);
  refreshBtn.innerHTML = ICON.refresh;
  if (state.isRefreshing && state.items.length === 0) {
    updatedLine.textContent = 'Pulling the latest from your sources…';
  } else if (state.lastRefreshed) {
    const ok = SOURCES.filter(s => state.enabled.has(s.id) && !(state.status[s.id] && state.status[s.id].error)).length;
    const total = SOURCES.filter(s => state.enabled.has(s.id)).length;
    const age = pulseRelative(state.lastRefreshed);
    updatedLine.textContent = 'Updated ' + (age === 'now' ? 'just now' : age + ' ago') + ' · ' + ok + ' of ' + total + ' sources OK';
  } else {
    updatedLine.textContent = 'Not refreshed yet';
  }
  if (state.savedIDs.size > 0) {
    savedCount.textContent = String(state.savedIDs.size);
    savedCount.hidden = false;
  } else {
    savedCount.hidden = true;
  }
}

function renderAll() {
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.classList.toggle('is-active', tab.dataset.view === state.view);
  });
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('is-active', view.id === 'view-' + state.view);
  });
  document.querySelectorAll('#filter-chips .chip').forEach(chip => {
    chip.classList.toggle('is-active', chip.dataset.filter === state.filter);
  });
  document.querySelectorAll('#sort-seg .seg-btn').forEach(button => {
    button.classList.toggle('is-active', button.dataset.sort === state.sort);
  });
  if (searchInput.value !== state.query) searchInput.value = state.query;
  renderHeader();
  renderFeed();
  renderSaved();
  renderSources();
}

// MARK: - Event wiring

document.getElementById('view-tabs').addEventListener('click', event => {
  const tab = event.target.closest('.view-tab');
  if (!tab) return;
  state.view = tab.dataset.view;
  renderAll();
});

document.getElementById('filter-chips').addEventListener('click', event => {
  const chip = event.target.closest('.chip');
  if (!chip) return;
  state.filter = chip.dataset.filter;
  renderAll();
});

document.getElementById('sort-seg').addEventListener('click', event => {
  const button = event.target.closest('.seg-btn');
  if (!button) return;
  state.sort = button.dataset.sort;
  renderAll();
});

document.getElementById('mark-read-btn').addEventListener('click', markAllRead);

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  renderFeed();
});

refreshBtn.addEventListener('click', () => { refresh(); });

function handleCardClick(event) {
  const saveCtl = event.target.closest('.save-ctl');
  if (saveCtl) {
    event.preventDefault();
    toggleSaved(saveCtl.dataset.id);
    return;
  }
  const card = event.target.closest('.card');
  if (!card) return;
  if (event.target.closest('a')) {
    markRead(card.dataset.id);
    renderHeader();
    renderFeed();
    renderSaved();
    return;
  }
  const url = card.dataset.url;
  if (url) {
    window.open(url, '_blank', 'noopener');
    markRead(card.dataset.id);
    renderAll();
  }
}

feedList.addEventListener('click', handleCardClick);
savedList.addEventListener('click', handleCardClick);

sourcesList.addEventListener('change', event => {
  const input = event.target.closest('input[data-source]');
  if (!input) return;
  setSourceEnabled(input.dataset.source, input.checked);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) bootstrap();
});

// MARK: - Start

restore();
renderAll();
bootstrap();