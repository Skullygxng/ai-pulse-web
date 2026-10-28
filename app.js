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
  { id: 'bluesky', name: 'Bluesky voices', kind: 'bluesky', category: 'community', handle: 'bsky.app', endpoint: '' },
  { id: 'x', name: 'X (scraped)', kind: 'x', category: 'community', handle: 'x.com', endpoint: '' },
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
  { id: 'google-research', name: 'Google Research', kind: 'rss', category: 'news', handle: 'research.google', endpoint: 'https://research.google/blog/rss/' },
  { id: 'msr', name: 'Microsoft Research', kind: 'rss', category: 'news', handle: 'microsoft.com/research', endpoint: 'https://www.microsoft.com/en-us/research/feed/' },
  { id: 'import-ai', name: 'Import AI', kind: 'rss', category: 'news', handle: 'importai.substack.com', endpoint: 'https://importai.substack.com/feed' },
  { id: 'interconnects', name: 'Interconnects', kind: 'rss', category: 'news', handle: 'interconnects.ai', endpoint: 'https://www.interconnects.ai/feed' },
  { id: 'latent-space', name: 'Latent Space', kind: 'rss', category: 'news', handle: 'latent.space', endpoint: 'https://www.latent.space/feed' },
  { id: 'one-useful-thing', name: 'One Useful Thing', kind: 'rss', category: 'news', handle: 'oneusefulthing.org', endpoint: 'https://www.oneusefulthing.org/feed' },
  { id: 'lesswrong', name: 'LessWrong', kind: 'rss', category: 'underground', handle: 'lesswrong.com', endpoint: 'https://www.lesswrong.com/feed.xml?view=tag-rss&tag=AI' },
  { id: 'gradient', name: 'The Gradient', kind: 'rss', category: 'underground', handle: 'thegradient.pub', endpoint: 'https://thegradient.pub/rss/' },
  { id: 'lobsters-ai', name: 'Lobsters · ai', kind: 'rss', category: 'underground', handle: 'lobste.rs/t/ai', endpoint: 'https://lobste.rs/t/ai.rss' },
  { id: 'hf-models', name: 'HF New Models', kind: 'hfModels', category: 'releases', handle: 'huggingface.co/models', endpoint: '' },
  { id: 'hf-papers', name: 'HF Daily Papers', kind: 'hfPapers', category: 'research', handle: 'huggingface.co/papers', endpoint: '' },
  { id: 'arxiv-ai', name: 'arXiv cs.AI', kind: 'rss', category: 'research', handle: 'arxiv.org', endpoint: 'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=30' },
  { id: 'arxiv-lg', name: 'arXiv cs.LG', kind: 'rss', category: 'research', handle: 'arxiv.org', endpoint: 'https://export.arxiv.org/api/query?search_query=cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=30' },
  { id: 'arxiv-cl', name: 'arXiv cs.CL', kind: 'rss', category: 'research', handle: 'arxiv.org', endpoint: 'https://export.arxiv.org/api/query?search_query=cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=30' },
  { id: 'yt-twominutepapers', name: 'Two Minute Papers', kind: 'youtube', category: 'videos', handle: 'youtube.com/@TwoMinutePapers', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg' },
  { id: 'yt-mlst', name: 'Machine Learning Street Talk', kind: 'youtube', category: 'videos', handle: 'youtube.com/@MachineLearningStreetTalk', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCMLtBahI5DMrt0NPvDSoIRQ' },
  { id: 'yt-wesroth', name: 'Wes Roth', kind: 'youtube', category: 'videos', handle: 'youtube.com/@WesRoth', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqcbQf6yw5KzRoDDcZ_wBSw' },
  { id: 'yt-mattwolfe', name: 'Matt Wolfe', kind: 'youtube', category: 'videos', handle: 'youtube.com/@mreflow', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChpleBmo18P08aKCIgti38g' },
  { id: 'yt-aiexplained', name: 'AI Explained', kind: 'youtube', category: 'videos', handle: 'youtube.com/@aiexplained-official', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw' },
  { id: 'yt-aicoffeebreak', name: 'AI Coffee Break', kind: 'youtube', category: 'videos', handle: 'youtube.com/@AICoffeeBreak', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCobqgqE4i5Kf7wrxRxhToQA' },
  { id: 'yt-deeplearningai', name: 'DeepLearningAI', kind: 'youtube', category: 'videos', handle: 'youtube.com/@DeepLearningAI', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCcIXc5mJsHVYTZR1maL5l9w' },
  { id: 'yt-sentdex', name: 'sentdex', kind: 'youtube', category: 'videos', handle: 'youtube.com/@sentdex', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCfzlCWGWYyIQ0aLC5w48gBQ' },
  { id: 'yt-yannic', name: 'Yannic Kilcher', kind: 'youtube', category: 'videos', handle: 'youtube.com/@YannicKilcher', endpoint: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew' }
];

const CATEGORIES = ['community', 'news', 'videos', 'underground', 'releases', 'research'];
const CATEGORY_TITLES = { community: 'Community', news: 'News', videos: 'Videos', underground: 'Underground', releases: 'New releases', research: 'Research' };
const PROXIES = [
  url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  url => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url)
];

/// YouTube refuses cross-origin reads itself, and its feed URL is flaky through
/// the public proxies, so channel feeds are also tried on Invidious mirrors —
/// same Atom shape, different host, reachable when youtube.com isn't.
const INVIDIOUS_FEEDS = [
  id => 'https://inv.nadeko.net/feed/channel/' + id,
  id => 'https://invidious.nerdvpn.de/feed/channel/' + id,
  id => 'https://iv.catgirl.cloud/feed/channel/' + id,
  id => 'https://yewtu.be/feed/channel/' + id
];

const delay = ms => new Promise(function (resolve) { setTimeout(resolve, ms); });

/// Browsers give unhelpful names to a blocked or dropped request.
function friendlyError(err) {
  const message = (err && err.message) || '';
  if (message === 'Load failed' || message === 'Failed to fetch' || message.indexOf('NetworkError') === 0) return 'Network error';
  if (err && err.name === 'AbortError') return 'Timed out';
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
  bluesky: ic('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
  x: ic('<path d="M4 4l16 16"/><path d="M20 4L4 20"/>'),
  release: ic('<path d="M12 2l2.4 6.2L21 10l-5 4.4L17.4 21 12 17.6 6.6 21 8 14.4 3 10l6.6-1.8z"/>'),
  play: ic('<polygon points="8 5 19 12 8 19 8 5" fill="currentColor" stroke="none"/>'),
  close: ic('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>'),
  rss: ic('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
  youtube: ic('<polygon points="5 3 19 12 5 21 5 3"/>'),
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
  'neural network', 'hugging face', 'open source model', 'open source ai', 'open-weight',
  'open weight', 'context window', 'fine-tune', 'fine tuned', 'reinforcement learning',
  'diffusion model', 'text-to-image', 'text to image', 'reasoning model', 'mixture of experts',
  'ai safety', 'alignment research', 'training run', 'training cluster', 'foundation model',
  'synthetic data', 'model weights', 'inference cost', 'sam altman', 'yann lecun',
  'ai agent', 'ai agents', 'ai model', 'ai models', 'ai startup', 'ai company', 'ai chip',
  'ai chips', 'ai research', 'ai lab', 'agentic', 'world model', 'test-time compute',
  'retrieval augmented', 'chain of thought', 'prompt engineering', 'vision language',
  'speech recognition', 'code assistant', 'llm inference', 'model training'
];

const AI_KEYWORDS = new Set([
  'ai', 'agi', 'llm', 'llms', 'gpt', 'gpt4', 'gpt5', 'chatgpt', 'openai', 'anthropic',
  'claude', 'gemini', 'deepmind', 'llama', 'mistral', 'deepseek', 'qwen', 'grok', 'xai',
  'perplexity', 'midjourney', 'copilot', 'ollama', 'vllm', 'transformer', 'transformers',
  'diffusion', 'inference', 'embedding', 'embeddings', 'dataset', 'datasets', 'benchmark',
  'benchmarks', 'superintelligence', 'quantization', 'quantized', 'multimodal', 'tokenizer',
  'finetune', 'finetuning', 'gpu', 'gpus', 'neural', 'langchain', 'rag', 'huggingface',
  'karpathy', 'sora', 'nvidia', 'agent', 'agents', 'chatbot', 'relu', 'weights',
  'pretraining', 'finetuned', 'tokens', 'hallucination', 'alignment', 'deepseek',
  'cohere', 'perplexity', 'runway', 'elevenlabs', 'stability', 'suno', 'cursor',
  'windsurf', 'devin', 'replit', 'gemma', 'phi', 'olmo', 'granite', 'nemotron',
  'mixture', 'multimodal', 'embedding', 'vector', 'embeddings', 'reasoning'
]);

function isAIRelevant(title) {
  const lower = (title || '').toLowerCase();
  for (const phrase of AI_PHRASES) {
    if (lower.includes(phrase)) return true;
  }
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some(t => AI_KEYWORDS.has(t));
}

// Which fetch path each source last succeeded with ('rss2json' or 'direct'),
// so the next refresh tries that first instead of re-failing the worse one.
const lastGoodMethod = {};

// RSS2JSON's free tier rate-limits per IP. When it does, stop hitting it
// for a while and let sources use the proxy chain instead.
let rss2jsonCooldownUntil = 0;

// MARK: - Networking
async function fetchResource(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const body = await response.text();
    return { ok: response.status >= 200 && response.status < 300, status: response.status, body: body };
  } finally {
    clearTimeout(timer);
  }
}

/// Direct first; a CORS-blocked or failed request falls back through public proxies.
async function fetchText(url) {
  try {
    const direct = await fetchResource(url, 4000);
    if (!direct.ok) throw new Error('HTTP ' + direct.status);
    return direct.body;
  } catch (directError) {
    let lastError = directError;
    for (const makeURL of PROXIES) {
      try {
        const proxied = await fetchResource(makeURL(url), 7000);
        if (!proxied.ok) throw new Error('HTTP ' + proxied.status);
        return proxied.body;
      } catch (proxyError) {
        lastError = proxyError;
      }
    }
    throw lastError;
  }
}

/// A server-side reader that answers for feeds the browser and the proxies
/// can't reach. It returns the page as text, not as XML, so the caller parses
/// whichever shape it got.
async function fetchReader(url) {
  const result = await fetchResource('https://r.jina.ai/' + url, 12000);
  if (!result.ok || !result.body) throw new Error('Reader unavailable');
  return result.body;
}

async function fetchJSON(url) {
  return JSON.parse(await fetchText(url));
}

// MARK: - Source loaders

async function loadHN() {
  // Ask for everything popular in the window rather than for the literal word
  // "AI", then keep the AI stories — otherwise "Anthropic ships Claude" or
  // "diffusion model" get missed for not containing the keyword.
  const since = Math.floor((Date.now() - 10 * 24 * 60 * 60 * 1000) / 1000);
  const data = await fetchJSON(
    'https://hn.algolia.com/api/v1/search_by_date?tags=story' +
    '&numericFilters=created_at_i%3E' + since + '%2Cpoints%3E15&hitsPerPage=300'
  );
  const hits = (data.hits || [])
    .filter(hit => hit.title && isAIRelevant(hit.title + ' ' + (hit.story_text || '')))
    .slice(0, 80);
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
function rateLimitError(message) {
  const err = new Error(message);
  err.rateLimited = true;
  return err;
}

async function fetchViaRSS2JSON(url) {
  if (Date.now() < rss2jsonCooldownUntil) throw new Error('RSS2JSON cooling down');
  const result = await fetchResource('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url), 12000);
  if (result.status === 403 || result.status === 429 || result.status === 466) {
    rss2jsonCooldownUntil = Date.now() + 10 * 60 * 1000;
    throw rateLimitError('RSS2JSON rate limited (HTTP ' + result.status + ')');
  }
  if (!result.ok) throw new Error('HTTP ' + result.status);
  const data = JSON.parse(result.body);
  if (data.status !== 'ok' || !data.feed) {
    const reason = data.message || 'Feed rejected';
    if (/limit/i.test(reason)) {
      rss2jsonCooldownUntil = Date.now() + 10 * 60 * 1000;
      throw rateLimitError(reason);
    }
    throw new Error(reason);
  }
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
/// blocked, its RSS feed goes through the same proxy chain as the blogs.
async function loadRedditRSS(sub) {
  const xml = await fetchText('https://www.reddit.com/r/' + sub + '/top.rss?t=day');
  return parseFeed(xml, redditSource(sub));
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
  return entries.slice(0, 40).map((entry, entryIndex) => {
    const rawTitle = childByLocalName(entry, ['title']);
    let title = decodeEntities(rawTitle ? rawTitle.textContent : '');

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
    let published = rawDate ? new Date(rawDate.textContent.trim()) : null;
    if (!published || isNaN(published.getTime())) {
      published = new Date(Date.now() - UNDATED_AGE_MS - entryIndex * 15 * 60 * 1000);
    }

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

/// The reader renders a feed page as markdown: "### [Headline](link)" lines with
/// the published date just under them. That is enough to rebuild a feed.
function parseFeedMarkdown(markdown, source) {
  const lines = markdown.split('\n');
  const items = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(/^#{2,4}\s+\[(.+?)\]\((.+?)\)/);
    if (!match) continue;

    let title = decodeEntities(match[1]).trim();
    const link = match[2].trim();
    if (!title || !link || seen.has(link)) continue;
    seen.add(link);

    let published = null;
    // The date usually sits a line or two after the headline, under the link.
    const nearby = [1, 2, 3, 4].map(step => lines[index + step] || '').join(' ');
    const date = nearby.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (date) {
      published = new Date(Date.UTC(+date[3], X_MONTHS[date[2]], +date[1], +date[4], +date[5], +date[6]));
    }

    if (source.stripsOutletSuffix) title = title.replace(/\s+-\s+[^-]+$/, '');

    items.push({
      id: source.id + '-' + stableHash(link),
      title: title,
      summary: '',
      articleURL: link,
      discussionURL: null,
      sourceID: source.id,
      sourceName: source.name,
      category: source.category,
      kind: 'rss',
      // No date is no excuse to claim "just now": park it a few hours back,
      // newest first, so it can't jump the queue ahead of fresh stories.
      publishedAt: published || new Date(Date.now() - UNDATED_AGE_MS - items.length * 15 * 60 * 1000),
      points: 0,
      commentCount: 0,
      author: null
    });
  }

  if (items.length === 0) throw new Error('Could not parse feed');
  items.sort((a, b) => b.publishedAt - a.publishedAt);
  return items.slice(0, 30);
}
async function loadRSSViaRSS2JSON(source) {
  const data = await fetchViaRSS2JSON(source.endpoint);
  const items = itemsFromRSS2JSON(data, source);
  lastGoodMethod[source.id] = 'rss2json';
  return items;
}

async function loadRSSDirect(source) {
  let text = '';
  try {
    text = await fetchText(source.endpoint);
  } catch (err) {
    text = '';
  }

  if (text) {
    try {
      const items = parseFeed(text, source);
      if (items.length) {
        lastGoodMethod[source.id] = 'direct';
        return items;
      }
    } catch (err) {
      /* fall through to the reader */
    }
  }

  const markdown = await fetchReader(source.endpoint);
  const items = parseFeedMarkdown(markdown, source);
  lastGoodMethod[source.id] = 'reader';
  return items;
}

async function loadRSSViaChain(source) {
  const preferred = lastGoodMethod[source.id] || 'direct';
  if (preferred === 'direct') {
    try {
      return await loadRSSDirect(source);
    } catch (directError) {
      return await loadRSSViaRSS2JSON(source);
    }
  } else {
    try {
      return await loadRSSViaRSS2JSON(source);
    } catch (rss2jsonError) {
      return await loadRSSDirect(source);
    }
  }
}

async function loadRSS(source) {
  const items = await loadRSSViaChain(source);
  // Feeds that ride the RSS chain but aren't plain blogs (YouTube) keep their
  // own kind, so cards show the right mark.
  return source.kind === 'rss' ? items : items.map(item => Object.assign({}, item, { kind: source.kind }));
}

// MARK: - YouTube

function youtubeChannelID(source) {
  const match = source.endpoint.match(/channel_id=([\w-]+)/);
  return match ? match[1] : '';
}

/// Whatever served the feed, cards should point at youtube.com and keep a
/// stable id, so read and saved state survive a flip between mirrors.
function normalizeYoutubeItem(source, item) {
  let url = item.articleURL || '';
  const video = url.match(/[?&]v=([\w-]{6,})/);
  if (video) url = 'https://www.youtube.com/watch?v=' + video[1];
  return Object.assign({}, item, { kind: source.kind, articleURL: url, id: source.id + '-' + stableHash(url || item.title) });
}

async function loadYoutubeFromInvidious(source) {
  const channelID = youtubeChannelID(source);
  let lastError = new Error('Could not load');
  for (const make of INVIDIOUS_FEEDS) {
    try {
      const items = parseFeed(await fetchText(make(channelID)), source);
      if (items.length) {
        lastGoodMethod[source.id] = 'invidious';
        return items.map(item => normalizeYoutubeItem(source, item));
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/// The nine channels fire together, and the services in their chain
/// rate-limit bursts, so each channel starts slightly after the last.
const YOUTUBE_STAGGER = new Map(SOURCES.filter(s => s.kind === 'youtube').map((s, i) => [s.id, i * 700]));

function loadYoutube(source) {
  const wait = YOUTUBE_STAGGER.get(source.id) || 0;
  return wait ? delay(wait).then(() => loadYoutubeNow(source)) : loadYoutubeNow(source);
}

async function loadYoutubeNow(source) {
  if (lastGoodMethod[source.id] === 'invidious') {
    try {
      return await loadYoutubeFromInvidious(source);
    } catch (invidiousError) {
      return (await loadRSSViaChain(source)).map(item => normalizeYoutubeItem(source, item));
    }
  }
  try {
    return (await loadRSSViaChain(source)).map(item => normalizeYoutubeItem(source, item));
  } catch (officialError) {
    return loadYoutubeFromInvidious(source);
  }
}

/// Hugging Face's daily papers API answers cross-origin directly, so research
/// stays reachable even when the feed proxies are blocked.
async function loadHFPapers() {
  const data = await fetchJSON('https://huggingface.co/api/daily_papers?limit=30');
  return (Array.isArray(data) ? data : []).map(entry => {
    const paper = entry.paper || entry;
    const title = paper.title || entry.title || '';
    let publishedAt = paper.publishedAt ? new Date(paper.publishedAt) : new Date();
    if (isNaN(publishedAt.getTime())) publishedAt = new Date();
    const authors = paper.authors || [];
    return {
      id: 'hf-paper-' + (paper.id || stableHash(title)),
      title: decodeEntities(title),
      summary: (paper.summary || '').replace(/\s+/g, ' ').trim().slice(0, 240),
      articleURL: paper.id ? 'https://huggingface.co/papers/' + paper.id : null,
      discussionURL: null,
      sourceID: 'hf-papers',
      sourceName: 'HF Daily Papers',
      category: 'research',
      kind: 'rss',
      publishedAt: publishedAt,
      points: entry.upvotes || paper.upvotes || 0,
      commentCount: entry.numComments || paper.numComments || 0,
      author: (authors[0] && authors[0].name) || null
    };
  }).filter(item => item.title);
}

/// X closed free access to its timeline: the Nitter mirrors that used to relay
/// it are dead or bot-walled, its API is paid, and its embed endpoint is
/// rate-limited. Almost every AI lab and researcher posts the same material on
/// Bluesky, whose public API is free, key-less and cross-origin friendly.
const BLUESKY_ACCOUNTS = [
  'simonwillison.net',
  'emollick.bsky.social',
  'natolambert.bsky.social',
  'karpathy.bsky.social'
];

async function fetchBlueskyAccount(handle) {
  const url = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=' +
    encodeURIComponent(handle) + '&limit=12&filter=posts_no_replies';
  const data = await fetchJSON(url);

  return (data.feed || []).map(entry => entry.post).filter(post => post && post.record && post.record.text).map(post => {
    const author = post.author || {};
    const handleUsed = author.handle || handle;
    const rkey = (post.uri || '').split('/').pop();
    const link = 'https://bsky.app/profile/' + handleUsed + '/post/' + rkey;
    let publishedAt = new Date(post.record.createdAt || post.indexedAt || Date.now());
    if (isNaN(publishedAt.getTime())) publishedAt = new Date();
    const text = post.record.text.replace(/\s+/g, ' ').trim();

    return {
      id: 'bsky-' + post.uri,
      title: text.slice(0, 220),
      summary: '',
      articleURL: link,
      discussionURL: link,
      sourceID: 'bluesky',
      sourceName: (author.displayName || '@' + handleUsed) + ' · Bluesky',
      category: 'community',
      kind: 'bluesky',
      publishedAt: publishedAt,
      points: post.likeCount || 0,
      commentCount: post.replyCount || 0,
      author: '@' + handleUsed
    };
  });
}

async function loadBluesky() {
  const settled = await Promise.allSettled(BLUESKY_ACCOUNTS.map(fetchBlueskyAccount));
  const items = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') items.push(...result.value);
  }
  if (items.length === 0) {
    const failure = settled.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  }
  items.sort((a, b) => engagement(b) - engagement(a));
  return items.slice(0, 40);
}

/// X has no free API, and the Nitter mirrors are gone. The free reader at
/// r.jina.ai will still render a public X profile to text, so that is what this
/// scrapes. It is best effort: no metrics, and if X or the reader refuses the
/// request the source simply reports an error.
const X_ACCOUNTS = ['OpenAI', 'AnthropicAI', 'GoogleDeepMind', 'huggingface', 'sama'];

function cleanXLine(line) {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[[^\]]*\]/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\bblob:https?:\/\/\S+/g, ' ')
    .replace(/\bImage \d+:[^)]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const X_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const X_DATE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/;

/// How old an item without a parseable date is treated as, so undated feeds
/// can't crowd out stories we know are fresh.
const UNDATED_AGE_MS = 6 * 60 * 60 * 1000;

/// The reader gives a profile page, so a post's date arrives as "Oct 23" next
/// to the handle. Using it keeps old posts from resurfacing as if they were new.
function xDateFromText(text) {
  const match = text.match(X_DATE);
  if (!match) return null;
  const now = new Date();
  const date = new Date(now.getFullYear(), X_MONTHS[match[1]], parseInt(match[2], 10), 12, 0, 0);
  if (date.getTime() > now.getTime() + 86400000) date.setFullYear(date.getFullYear() - 1);
  return date;
}

/// "Google DeepMind @GoogleDeepMind Oct 23 Using a single…" → "Using a single…"
function xPostText(text) {
  return text
    .replace(/^(?:@\w+\s+)?.*?\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+/, '')
    .replace(/^@\w+\s+/, '')
    .trim();
}

function parseXProfile(markdown, handle) {
  const lines = markdown.split('\n');
  const posts = [];
  const skip = /^(pinned|who to follow|trends|most popular|last seen|people also)/i;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('*')) continue;              // tweets arrive as bullets
    const cleaned = cleanXLine(trimmed.replace(/^\*\s*/, '')).replace(/^Image \d+:[^)]*/, '').trim();
    if (cleaned.length < 40 || skip.test(cleaned)) continue;

    const text = xPostText(cleaned);
    if (text.length < 30) continue;
    posts.push({ text: text.slice(0, 220), date: xDateFromText(cleaned) });
  }

  const seen = new Set();
  const items = [];
  for (const post of posts) {
    const key = stableHash(post.text);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: 'x-' + handle.toLowerCase() + '-' + key,
      title: post.text,
      summary: '',
      articleURL: 'https://x.com/' + handle,
      discussionURL: 'https://x.com/' + handle,
      sourceID: 'x',
      sourceName: '@' + handle + ' · X',
      category: 'community',
      kind: 'x',
      publishedAt: post.date || new Date(),
      points: 0,
      commentCount: 0,
      author: '@' + handle
    });
  }
  return items.slice(0, 8);
}

async function fetchXAccount(handle) {
  const reader = 'https://r.jina.ai/https://x.com/' + encodeURIComponent(handle);
  const markdown = await fetchText(reader);
  return parseXProfile(markdown, handle);
}

async function loadX() {
  const settled = await Promise.allSettled(X_ACCOUNTS.map(fetchXAccount));
  const items = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') items.push(...result.value);
  }
  if (items.length === 0) {
    const failure = settled.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    throw new Error('X blocked the scrape');
  }
  return items;
}

/// Trending models on Hugging Face are the closest thing to a live release feed:
/// every open model launch shows up here within hours.
async function loadHFModels() {
  const data = await fetchJSON('https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=40');
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  return (Array.isArray(data) ? data : [])
    .filter(model => model.id && new Date(model.createdAt || 0).getTime() > cutoff)
    .map(model => {
      const owner = model.id.split('/')[0];
      const name = model.id.split('/').pop();
      const task = (model.pipeline_tag || '').replace(/-/g, ' ');
      return {
        id: 'hfm-' + model.id,
        title: name + (task ? ' — new ' + task + ' model' : ' — new model'),
        summary: 'by ' + owner + ' · ' + compactCount(model.likes || 0) + ' likes · ' + compactCount(model.downloads || 0) + ' downloads',
        articleURL: 'https://huggingface.co/' + model.id,
        discussionURL: null,
        sourceID: 'hf-models',
        sourceName: 'HF New Models',
        category: 'releases',
        kind: 'release',
        publishedAt: new Date(model.createdAt || Date.now()),
        points: model.likes || 0,
        commentCount: 0,
        author: owner
      };
    });
}

async function loadSource(source) {
  if (source.kind === 'hn') return loadHN();
  if (source.kind === 'reddit') return loadReddit(source.endpoint);
  if (source.kind === 'hfPapers') return loadHFPapers();
  if (source.kind === 'hfModels') return loadHFModels();
  if (source.kind === 'bluesky') return loadBluesky();
  if (source.kind === 'x') return loadX();
  if (source.kind === 'youtube') return loadYoutube(source);
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
  view: 'feed',
  renderLimit: 30,
  visibleCount: 0
};

function persist() {
  const snapshot = {
    items: state.items.slice(0, 600).map(item => Object.assign({}, item, { publishedAt: item.publishedAt.toISOString() })),
    saved: state.saved.map(item => Object.assign({}, item, { publishedAt: item.publishedAt.toISOString() })),
    readIDs: Array.from(state.readIDs),
    enabled: Array.from(state.enabled),
    known: SOURCES.map(s => s.id),
    status: state.status,
    methods: lastGoodMethod,
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
    // Sources added since the snapshot was written start on, so a new one
    // isn't silently left off for everyone who already has saved state.
    const known = new Set(data.known || data.enabled || []);
    for (const id of defaultEnabled()) {
      if (!known.has(id)) state.enabled.add(id);
    }
    state.status = data.status || {};
    Object.assign(lastGoodMethod, data.methods || {});
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

// Fast, dependable sources paint first; Reddit and the X scrape come last.
const SOURCE_PRIORITY = { hn: 0, hfPapers: 0, hfModels: 0, bluesky: 1, rss: 2, youtube: 2, reddit: 3, x: 4 };

function priorityValue(source) {
  const value = SOURCE_PRIORITY[source.kind];
  return typeof value === 'number' ? value : 2;
}

function mergeSources(sources, results, previousBySource) {
  const now = new Date();
  const merged = [];
  const seenAddresses = new Set();
  const seenTitles = new Set();
  const refreshedStatus = {};

  for (const source of sources) {
    const result = results.get(source.id);
    let sourceItems;
    if (result && !result.error) {
      sourceItems = result.items;
      refreshedStatus[source.id] = { count: result.items.length, error: null, updatedAt: now.toISOString() };
    } else if (result) {
      // A source that fails keeps what it had, so a flaky request never empties the feed.
      sourceItems = previousBySource[source.id] || [];
      refreshedStatus[source.id] = {
        count: sourceItems.length,
        error: result.error,
        updatedAt: (state.status[source.id] && state.status[source.id].updatedAt) || null
      };
    } else {
      // Still in flight: keep showing what this source had.
      sourceItems = previousBySource[source.id] || [];
      refreshedStatus[source.id] = state.status[source.id] || { count: sourceItems.length, error: null, updatedAt: null };
    }

    for (const item of sourceItems) {
      const address = dedupeKey(item);
      const key = titleKey(item);
      if (seenAddresses.has(address) || seenTitles.has(key)) continue;
      seenAddresses.add(address);
      seenTitles.add(key);
      merged.push(item);
    }
  }

  merged.sort((a, b) => score(b, now) - score(a, now));
  return { items: merged.slice(0, 600), status: refreshedStatus };
}

async function refresh() {
  if (state.isRefreshing) return;
  state.isRefreshing = true;
  renderHeader();
  renderFeed();

  const sources = SOURCES.filter(s => state.enabled.has(s.id))
    .slice()
    .sort((a, b) => priorityValue(a) - priorityValue(b));

  const previousBySource = {};
  for (const item of state.items) {
    (previousBySource[item.sourceID] = previousBySource[item.sourceID] || []).push(item);
  }

  const results = new Map();
  let lastPaint = 0;

  await Promise.all(sources.map(async (source, index) => {
    await delay(index * 120);
    let result;
    try {
      result = { items: await loadSource(source), error: null };
    } catch (err) {
      result = { items: [], error: friendlyError(err) };
    }
    results.set(source.id, result);

    // Paint as each source lands, so the feed fills in instead of waiting for
    // the slowest one.
    const now = Date.now();
    if (now - lastPaint > 400) {
      lastPaint = now;
      const merged = mergeSources(sources, results, previousBySource);
      state.items = merged.items;
      state.status = merged.status;
      renderHeader();
      renderFeed();
    }
  }));

  const merged = mergeSources(sources, results, previousBySource);
  state.items = merged.items;
  state.status = merged.status;
  state.lastRefreshed = new Date();
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

function youtubeId(item) {
  const match = (item.articleURL || '').match(/[?&]v=([\w-]{6,})/);
  return match ? match[1] : '';
}

function cardHTML(item, isSavedCard) {
  const isRead = state.readIDs.has(item.id);
  const isSaved = state.savedIDs.has(item.id);
  const openURL = item.articleURL || item.discussionURL || '';
  const videoID = item.kind === 'youtube' ? youtubeId(item) : '';
  const metrics = [];
  if (item.points > 0) metrics.push('<span class="metric">' + ICON.arrowUp + compactCount(item.points) + '</span>');
  if (item.commentCount > 0) metrics.push('<span class="metric">' + ICON.comment + compactCount(item.commentCount) + '</span>');

  const discussion = (!videoID && item.discussionURL)
    ? '<a class="discussion-ctl" href="' + escapeAttr(item.discussionURL) + '" target="_blank" rel="noopener">' + ICON.link + 'Discussion</a>'
    : '';

  // Videos get a thumbnail and play in the app; their title is not a link, so a
  // tap anywhere on the card plays instead of handing off to the YouTube app.
  const thumb = videoID
    ? '<div class="video-thumb"><img src="https://i.ytimg.com/vi/' + escapeAttr(videoID) +
      '/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' +
      '<span class="play-badge" aria-hidden="true">' + ICON.play + '</span></div>'
    : '';

  const titleHTML = videoID
    ? '<h3 class="card-title">' + escapeHtml(item.title) + '</h3>'
    : '<h3 class="card-title"><a href="' + escapeAttr(openURL || '#') + '" target="_blank" rel="noopener">' + escapeHtml(item.title) + '</a></h3>';

  const playCtl = videoID
    ? '<span class="watch-ctl">' + ICON.play + 'Play</span>'
    : '';

  return (
    '<article class="card' + (isRead ? ' is-read' : '') + (videoID ? ' is-video' : '') +
      '" data-id="' + escapeAttr(item.id) + '" data-url="' + escapeAttr(openURL) + '" data-video="' + escapeAttr(videoID) + '">' +
      '<div class="card-head">' +
        '<span class="glyph glyph-' + item.category + '">' + (ICON[item.kind] || ICON.rss) + '</span>' +
        '<span class="card-source">' + escapeHtml(item.sourceName) + '</span>' +
        '<span class="dot-sep">·</span>' +
        '<span class="card-age">' + pulseRelative(item.publishedAt) + '</span>' +
        (isRead ? '' : '<span class="unread-dot"></span>') +
        '<button class="save-ctl' + (isSaved ? ' is-saved' : '') + '" data-id="' + escapeAttr(item.id) + '" title="' + (isSaved ? 'Remove from saved' : 'Save') + '" aria-label="' + (isSaved ? 'Remove from saved' : 'Save') + '">' + ICON.bookmark + '</button>' +
      '</div>' +
      thumb +
      titleHTML +
      (item.summary ? '<p class="card-summary">' + escapeHtml(item.summary) + '</p>' : '') +
      '<div class="card-meta">' +
        '<span class="card-cat cat-' + item.category + '">' + CATEGORY_TITLES[item.category] + '</span>' +
        playCtl + metrics.join('') + discussion +
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
  state.visibleCount = items.length;
  if (items.length === 0) {
    feedList.innerHTML =
      '<div class="empty"><h2>' +
      (state.query ? 'No matches' : 'Nothing here yet') +
      '</h2><p>' +
      (state.query ? 'Try a different search.' : 'Pull down to refresh, or turn more sources on in the Sources tab.') +
      '</p></div>';
    return;
  }
  // Only a screenful or two goes into the DOM at a time; more is appended as
  // the reader scrolls, which keeps the first paint quick.
  const shown = items.slice(0, state.renderLimit);
  let html = shown.map(item => cardHTML(item, false)).join('');
  if (items.length > shown.length) {
    html += '<button class="load-more" type="button">Show more stories</button>';
  }
  feedList.innerHTML = html;
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
  } else if (state.isRefreshing) {
    updatedLine.textContent = 'Refreshing your sources…';
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
    const on = chip.dataset.filter === state.filter;
    chip.classList.toggle('is-active', on);
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('#sort-seg .seg-btn').forEach(button => {
    const on = button.dataset.sort === state.sort;
    button.classList.toggle('is-active', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (searchInput.value !== state.query) searchInput.value = state.query;

  renderHeader();
  // Only the visible list is rebuilt; the others are built when they're opened.
  if (state.view === 'feed') renderFeed();
  else if (state.view === 'saved') renderSaved();
  else renderSources();
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
  state.renderLimit = 30;
  renderAll();
});

document.getElementById('sort-seg').addEventListener('click', event => {
  const button = event.target.closest('.seg-btn');
  if (!button) return;
  state.sort = button.dataset.sort;
  state.renderLimit = 30;
  renderAll();
});

document.getElementById('mark-read-btn').addEventListener('click', markAllRead);

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  state.renderLimit = 30;
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

  // Video cards play inside the app; anything else opens the original page.
  if (card.dataset.video) {
    const item = findItem(card.dataset.id);
    if (item) {
      markRead(item.id);
      renderAll();
      openVideo(item);
    }
    return;
  }

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

// Only the first page of stories is in the DOM, so both ways of asking for more
// just extend it.
feedList.addEventListener('click', event => {
  if (!event.target.closest('.load-more')) return;
  state.renderLimit += 30;
  renderFeed();
});

const feedScroller = document.getElementById('view-feed');

feedScroller.addEventListener('scroll', () => {
  if (state.renderLimit >= state.visibleCount) return;
  if (feedScroller.scrollTop + feedScroller.clientHeight < feedScroller.scrollHeight - 700) return;
  state.renderLimit += 30;
  renderFeed();
}, { passive: true });

// Pull the feed down at the top to refresh it — the lists scroll inside the
// app frame, so the browser's own pull-to-refresh never fires.
const pullHint = document.getElementById('pull-hint');
const PULL_THRESHOLD = 70;
let pullStartY = null;
let pullDistance = 0;

function setPullHint(progress) {
  if (!pullHint) return;
  if (progress <= 0) {
    pullHint.classList.remove('is-on');
    return;
  }
  pullHint.classList.add('is-on');
  pullHint.textContent = progress >= 1 ? 'Release to refresh' : 'Pull to refresh';
}

feedScroller.addEventListener('touchstart', event => {
  pullStartY = feedScroller.scrollTop <= 0 ? event.touches[0].clientY : null;
  pullDistance = 0;
}, { passive: true });

feedScroller.addEventListener('touchmove', event => {
  if (pullStartY === null || state.isRefreshing) return;
  pullDistance = event.touches[0].clientY - pullStartY;
  if (pullDistance > 0) setPullHint(Math.min(1, pullDistance / PULL_THRESHOLD));
}, { passive: true });

feedScroller.addEventListener('touchend', () => {
  const shouldRefresh = pullDistance > PULL_THRESHOLD && !state.isRefreshing;
  setPullHint(0);
  pullStartY = null;
  pullDistance = 0;
  if (shouldRefresh) refresh();
}, { passive: true });

feedScroller.addEventListener('touchcancel', () => {
  setPullHint(0);
  pullStartY = null;
  pullDistance = 0;
}, { passive: true });

sourcesList.addEventListener('change', event => {
  const input = event.target.closest('input[data-source]');
  if (!input) return;
  setSourceEnabled(input.dataset.source, input.checked);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) bootstrap();
});

// MARK: - Updates

// Bump this together with version.json whenever the site changes: a running
// copy compares the two and offers a one-tap reload instead of going stale.
const APP_VERSION = '2026-10-28.17';
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

const updatePill = document.getElementById('update-pill');
const updateBtn = document.getElementById('update-btn');

function showUpdateNotice() {
  if (updatePill) updatePill.hidden = false;
}

async function checkForUpdate() {
  try {
    const response = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (data && data.version && data.version !== APP_VERSION) showUpdateNotice();
  } catch (err) {
    /* Offline — nothing to compare against. */
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  navigator.serviceWorker.register('sw.js', { scope: './' }).then(registration => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateNotice();
      });
    });
  }).catch(() => {});
}

function startUpdateWatcher() {
  const versionLine = document.getElementById('app-version');
  if (versionLine) versionLine.textContent = 'AI Pulse ' + APP_VERSION + ' · updates automatically';

  checkForUpdate();
  setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForUpdate();
  });
}

if (updateBtn) {
  updateBtn.addEventListener('click', () => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    // A cache-busting address guarantees the reload lands on the newest files,
    // even on networks or service workers holding an older copy.
    const url = new URL(location.href);
    url.searchParams.set('v', String(Date.now()));
    location.replace(url.toString());
  });
}

// MARK: - Video player

const videoSheet = document.getElementById('video-sheet');
const videoFrame = document.getElementById('video-frame');
const videoTitle = document.getElementById('video-title');
const videoSub = document.getElementById('video-sub');
const videoOpen = document.getElementById('video-open');
const videoCloseBtn = document.getElementById('video-close');

function findItem(id) {
  return state.items.find(item => item.id === id) || state.saved.find(item => item.id === id) || null;
}

function openVideo(item) {
  const id = youtubeId(item);
  if (!id) {
    if (item.articleURL) window.open(item.articleURL, '_blank', 'noopener');
    return;
  }
  if (!videoSheet || !videoFrame) return;

  videoTitle.textContent = item.title;
  videoSub.textContent = item.sourceName + ' · ' + pulseRelative(item.publishedAt);
  videoOpen.href = item.articleURL || '#';
  // The privacy-friendly embed keeps playback in the app instead of handing the
  // link to the YouTube app.
  videoFrame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1';
  videoSheet.hidden = false;
}

function closeVideo() {
  if (!videoSheet) return;
  videoSheet.hidden = true;
  if (videoFrame) videoFrame.src = 'about:blank';
}

if (videoCloseBtn) videoCloseBtn.addEventListener('click', closeVideo);
if (videoSheet) {
  videoSheet.addEventListener('click', event => {
    if (event.target === videoSheet) closeVideo();
  });
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && videoSheet && !videoSheet.hidden) closeVideo();
});

// MARK: - Start

restore();
renderAll();
bootstrap();
startUpdateWatcher();
registerServiceWorker();