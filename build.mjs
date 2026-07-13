// namuga.app static site + blog builder
// Reads: source .html files, _partials/, content/blog/*.md
// Writes: dist/

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { site } from './site.config.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PARTIAL_DIR = path.join(ROOT, '_partials');
const BLOG_SRC = path.join(ROOT, 'content', 'blog');
const IMAGES_DIR = path.join(ROOT, 'images');

// -----------------------------------------------------------------
// FS helpers
// -----------------------------------------------------------------

async function rimraf(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyTree(src, dest) {
  if (!existsSync(src)) return;
  const stat = await fs.stat(src);
  if (stat.isFile()) {
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
    return;
  }
  await ensureDir(dest);
  for (const entry of await fs.readdir(src)) {
    await copyTree(path.join(src, entry), path.join(dest, entry));
  }
}

async function walkFiles(dir, filter = () => true, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

// -----------------------------------------------------------------
// Template engine (tiny)
// -----------------------------------------------------------------

const partialCache = new Map();
async function loadPartial(name) {
  if (partialCache.has(name)) return partialCache.get(name);
  const raw = await fs.readFile(path.join(PARTIAL_DIR, `${name}.html`), 'utf8');
  partialCache.set(name, raw);
  return raw;
}

function relRoot(_destRel) {
  // Absolute paths from domain root — works regardless of page depth.
  return '/';
}

// PostHog 스니펫은 posthog:start ~ posthog:end 마커 사이에 위치.
// 키가 없으면 블록 자체를 제거(로컬 개발 안전). 있으면 {{POSTHOG_KEY}} 치환.
const POSTHOG_BLOCK_RE = /[ \t]*<!--\s*posthog:start\s*-->[\s\S]*?<!--\s*posthog:end\s*-->\s*/g;

function applyPosthog(html) {
  const key = process.env.POSTHOG_KEY;
  if (!key) return html.replace(POSTHOG_BLOCK_RE, '');
  return html.replaceAll('{{POSTHOG_KEY}}', key);
}

function applyVars(html, root) {
  return applyPosthog(html)
    .replaceAll('{{ROOT}}', root)
    .replaceAll('{{SITE_EMAIL}}', site.email)
    .replaceAll('{{APP_STORE_URL}}', site.appStoreUrl)
    .replaceAll('{{PLAY_STORE_URL}}', site.playStoreUrl)
    .replaceAll('{{SITE_URL}}', site.url)
    .replaceAll('{{SITE_NAME}}', site.name);
}

const INCLUDE_RE = /<!--\s*@include:([a-z0-9-]+)\s*-->/g;
const IMAGE_RE = /<!--\s*@image:([^,\s]+)(?:,alt=([^->]+?))?\s*-->/g;

async function expandIncludes(html, depth = 0) {
  if (depth > 5) return html;
  const matches = [...html.matchAll(INCLUDE_RE)];
  for (const m of matches) {
    const partial = await loadPartial(m[1]);
    html = html.replace(m[0], partial);
  }
  if (INCLUDE_RE.test(html)) return await expandIncludes(html, depth + 1);
  return html;
}

function expandImages(html, opts = {}) {
  return html.replaceAll(IMAGE_RE, (_full, filename, alt = '') => {
    const src = `${opts.root}images/${filename}`;
    const localPath = path.join(IMAGES_DIR, filename);
    const altText = (alt || '').trim() || '';
    if (existsSync(localPath)) {
      return `<img src="${src}" alt="${escapeHtml(altText)}" loading="lazy">`;
    }
    // Placeholder
    return `<div class="image-placeholder" role="img" aria-label="${escapeHtml(altText || '이미지 예정')}"><span aria-hidden="true">🌳</span></div>`;
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// -----------------------------------------------------------------
// Build source HTML files
// -----------------------------------------------------------------

async function buildSourceHtml() {
  // Root html files (excluding _partials and dist)
  const files = await walkFiles(ROOT, (p) => {
    if (!p.endsWith('.html')) return false;
    if (p.startsWith(PARTIAL_DIR)) return false;
    if (p.startsWith(DIST)) return false;
    if (p.includes(`${path.sep}content${path.sep}`)) return false;
    return true;
  });

  for (const src of files) {
    const rel = path.relative(ROOT, src);
    const dest = path.join(DIST, rel);
    let html = await fs.readFile(src, 'utf8');
    const root = relRoot(rel);
    html = await expandIncludes(html);
    html = applyVars(html, root);
    html = expandImages(html, { root });
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, html);
  }
}

// -----------------------------------------------------------------
// Blog
// -----------------------------------------------------------------

async function loadPosts() {
  if (!existsSync(BLOG_SRC)) return [];
  const files = (await fs.readdir(BLOG_SRC)).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(BLOG_SRC, f), 'utf8');
    const { data, content } = matter(raw);
    const slug = data.slug || f.replace(/\.md$/, '');
    posts.push({
      slug,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || '',
      category: data.category || 'essay',
      keywords: data.keywords || [],
      thumbnail: data.thumbnail || null,
      content,
    });
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function readMinutes(md) {
  const clean = md.replace(/[#>*_`\-]/g, '');
  return Math.max(1, Math.ceil(clean.length / 500));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

async function renderPage({ dest, title, description, bodyHtml, extraHead = '', canonical, ogType = 'website' }) {
  const root = relRoot(dest);
  const template = `<!DOCTYPE html>
<html lang="ko">
<head>
  <!-- @include:head -->
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:site_name" content="${escapeHtml(site.name)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  ${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
  ${extraHead}
</head>
<body>

<!-- @include:header -->

${bodyHtml}

<!-- @include:footer -->

</body>
</html>
`;
  let html = await expandIncludes(template);
  html = applyVars(html, root);
  html = expandImages(html, { root });
  const outPath = path.join(DIST, dest);
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, html);
}

function postThumbHtml(post) {
  if (post.thumbnail && existsSync(path.join(IMAGES_DIR, post.thumbnail))) {
    return `<img src="{{ROOT}}images/${post.thumbnail}" alt="${escapeHtml(post.title)}" loading="lazy">`;
  }
  return `<div class="image-placeholder" role="img" aria-label="${escapeHtml(post.title)}"><span aria-hidden="true">🌿</span></div>`;
}

async function buildBlogIndex(posts) {
  const cards = posts
    .map(
      (p) => `
    <article class="post-card">
      <a class="post-card-thumb" href="{{ROOT}}blog/${escapeHtml(p.slug)}/" aria-hidden="true" tabindex="-1">
        ${postThumbHtml(p)}
      </a>
      <div class="post-card-body">
        <div class="post-card-meta">
          <span class="post-date">${escapeHtml(formatDate(p.date))}</span>
        </div>
        <h2><a href="{{ROOT}}blog/${escapeHtml(p.slug)}/">${escapeHtml(p.title)}</a></h2>
        <p>${escapeHtml(p.description)}</p>
        <a class="post-read" href="{{ROOT}}blog/${escapeHtml(p.slug)}/">이야기 읽기 <span class="arrow" aria-hidden="true">→</span></a>
      </div>
    </article>`,
    )
    .join('\n');

  const body = `
<main>
  <section class="blog-hero">
    <div class="container">
      <span class="section-label">블로그</span>
      <h1>이야기를 남기는 마음</h1>
      <p class="section-lead">부모님과 어떻게 이야기를 시작할지, 어떤 질문이 좋을지 고민된다면. 먼저 시작한 가족들의 이야기와 안내를 모았습니다.</p>
    </div>
  </section>
  <section>
    <div class="container">
      <div class="blog-grid">
        ${cards || '<p style="grid-column: 1/-1; text-align:center; color: var(--color-text-muted); padding: 40px 0;">아직 게시된 글이 없습니다.</p>'}
      </div>
    </div>
  </section>
</main>
`;

  await renderPage({
    dest: 'blog/index.html',
    title: '블로그 — 나무가 나뭇가지에게',
    description: '부모님과 어떻게 이야기를 시작할지 고민될 때, 먼저 시작한 가족들의 이야기와 질문 가이드를 확인하세요.',
    canonical: `${site.url}/blog/`,
    bodyHtml: body,
  });
}

async function buildBlogPost(post) {
  const html = marked.parse(post.content);
  const minutes = readMinutes(post.content);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: site.name },
    publisher: { '@type': 'Organization', name: site.name },
    mainEntityOfPage: `${site.url}/blog/${post.slug}/`,
    keywords: (post.keywords || []).join(', '),
  };

  const body = `
<main>
  <article class="article">
    <div class="container-narrow">
      <a class="article-back" href="{{ROOT}}blog/">← 블로그로 돌아가기</a>
      <div class="article-meta">
        <span>${escapeHtml(formatDate(post.date))}</span>
        <span aria-hidden="true">·</span>
        <span>${minutes}분 읽기</span>
      </div>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="article-body">
        ${html}
      </div>
      <div class="article-cta">
        <!-- @include:cta-notify -->
      </div>
    </div>
  </article>
</main>
`;

  const extraHead = `
  <meta property="article:published_time" content="${escapeHtml(post.date)}">
  ${(post.keywords || []).map((k) => `<meta property="article:tag" content="${escapeHtml(k)}">`).join('\n')}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `;

  await renderPage({
    dest: `blog/${post.slug}/index.html`,
    title: `${post.title} — 나무가 나뭇가지에게`,
    description: post.description,
    canonical: `${site.url}/blog/${post.slug}/`,
    ogType: 'article',
    bodyHtml: body,
    extraHead,
  });
}

// -----------------------------------------------------------------
// SEO artifacts
// -----------------------------------------------------------------

async function writeSitemap(posts) {
  const urls = [
    { loc: `${site.url}/`, priority: '1.0' },
    { loc: `${site.url}/blog/`, priority: '0.8' },
    { loc: `${site.url}/support/`, priority: '0.6' },
    { loc: `${site.url}/privacy/`, priority: '0.4' },
    { loc: `${site.url}/terms/`, priority: '0.4' },
    ...posts.map((p) => ({
      loc: `${site.url}/blog/${p.slug}/`,
      lastmod: typeof p.date === 'string' ? p.date : p.date.toISOString().slice(0, 10),
      priority: '0.7',
    })),
  ];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  await fs.writeFile(path.join(DIST, 'sitemap.xml'), xml);
}

async function writeRobots() {
  const txt = `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
  await fs.writeFile(path.join(DIST, 'robots.txt'), txt);
}

async function writeRss(posts) {
  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${site.url}/blog/${p.slug}/</link>
      <guid>${site.url}/blog/${p.slug}/</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeHtml(p.description)}</description>
    </item>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(site.name)}</title>
    <link>${site.url}/blog/</link>
    <description>${escapeHtml(site.description)}</description>
    <language>ko-KR</language>
${items}
  </channel>
</rss>
`;
  await fs.writeFile(path.join(DIST, 'rss.xml'), xml);
}

// -----------------------------------------------------------------
// Main
// -----------------------------------------------------------------

async function main() {
  console.log('▸ Cleaning dist/');
  await rimraf(DIST);
  await ensureDir(DIST);

  console.log('▸ Copying static assets');
  await fs.copyFile(path.join(ROOT, 'style.css'), path.join(DIST, 'style.css'));
  await fs.copyFile(path.join(ROOT, 'main.js'), path.join(DIST, 'main.js'));
  if (existsSync(IMAGES_DIR)) {
    await copyTree(IMAGES_DIR, path.join(DIST, 'images'));
  }

  console.log('▸ Building HTML pages');
  await buildSourceHtml();

  console.log('▸ Building blog');
  const posts = await loadPosts();
  await buildBlogIndex(posts);
  for (const p of posts) await buildBlogPost(p);
  console.log(`  ${posts.length} post(s) built`);

  console.log('▸ Writing sitemap.xml, robots.txt, rss.xml');
  await writeSitemap(posts);
  await writeRobots();
  await writeRss(posts);

  console.log('✓ Build complete → dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
