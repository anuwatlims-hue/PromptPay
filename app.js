import {
  excerpt,
  filterItems,
  formatDuration,
  formatThaiDate,
  postEmbedUrl,
  sortNewestFirst,
  validateContent,
  videoEmbedUrl,
} from './lib.js';

const PAGE_SIZE = 6;
const TYPE_LABEL = { video: 'วิดีโอ', photo: 'ภาพนิ่ง', post: 'โพสต์' };

const $ = (selector) => document.querySelector(selector);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...[].concat(children).filter(Boolean));
  return node;
}

function embedFrame(src, title) {
  return el('iframe', {
    src,
    title,
    loading: 'lazy',
    allow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share',
    allowfullscreen: '',
    referrerpolicy: 'strict-origin-when-cross-origin',
  });
}

/* ---------- viewer (dialog) ---------- */

const viewer = $('#viewer');
const viewerMedia = $('#viewer-media');

function openViewer(item, categories) {
  $('#viewer-title').textContent = item.title;
  $('#viewer-meta').textContent = metaLine(item, categories);
  $('#viewer-text').textContent = item.text;
  $('#viewer-link').href = item.url;

  const isVideo = item.type === 'video';
  if (!isVideo && item.images?.length) {
    viewerMedia.className = 'viewer-media is-gallery';
    viewerMedia.replaceChildren(...gallery(item));
  } else {
    viewerMedia.className = `viewer-media ${isVideo ? `is-video is-${item.orientation}` : 'is-post'}`;
    // The post plugin renders at a fixed pixel width, so size it to the space actually available.
    const width = Math.min(500, document.documentElement.clientWidth - 32);
    const src = isVideo ? videoEmbedUrl(item.videoUrl, { autoplay: true }) : postEmbedUrl(item.url, width);
    viewerMedia.replaceChildren(embedFrame(src, item.title));
    if (!isVideo) viewerMedia.style.setProperty('--post-width', `${width}px`);
  }

  if (typeof viewer.showModal === 'function') viewer.showModal();
  else viewer.setAttribute('open', '');
}

/** Swipeable strip of locally hosted photos with previous/next buttons. */
function gallery(item) {
  const total = item.images.length;
  const strip = el(
    'div',
    { class: 'gallery-strip', tabindex: '0', 'aria-label': `ภาพทั้งหมด ${total} ภาพ` },
    item.images.map((image, index) =>
      el('img', {
        src: image.src,
        alt: image.alt || `${item.title} (ภาพที่ ${index + 1})`,
        loading: index === 0 ? 'eager' : 'lazy',
        decoding: 'async',
      }),
    ),
  );
  if (total === 1) return [strip];

  const counter = el('span', { class: 'gallery-count', 'aria-live': 'polite', text: `1 / ${total}` });
  const step = (direction) => strip.scrollBy({ left: direction * strip.clientWidth, behavior: 'smooth' });
  strip.addEventListener('scroll', () => {
    const index = Math.round(strip.scrollLeft / Math.max(strip.clientWidth, 1));
    counter.textContent = `${Math.min(index + 1, total)} / ${total}`;
  });
  return [
    strip,
    el('button', { class: 'gallery-nav gallery-prev', type: 'button', 'aria-label': 'ภาพก่อนหน้า', text: '‹', onclick: () => step(-1) }),
    el('button', { class: 'gallery-nav gallery-next', type: 'button', 'aria-label': 'ภาพถัดไป', text: '›', onclick: () => step(1) }),
    counter,
  ];
}

function closeViewer() {
  if (viewer.open && typeof viewer.close === 'function') viewer.close();
  else viewer.removeAttribute('open');
}

// Dropping the iframe is what actually stops video playback.
viewer.addEventListener('close', () => viewerMedia.replaceChildren());
viewer.querySelector('.viewer-close').addEventListener('click', closeViewer);
viewer.addEventListener('click', (event) => {
  if (event.target === viewer) closeViewer();
});

/* ---------- rendering ---------- */

function metaLine(item, categories) {
  const parts = [formatThaiDate(item.date), categories[item.category], TYPE_LABEL[item.type]];
  if (item.type === 'video') parts.push(formatDuration(item.durationSeconds));
  if (item.sharedFrom) parts.push(`แชร์จาก ${item.sharedFrom}`);
  return parts.filter(Boolean).join(' · ');
}

function renderSite(content) {
  const { site } = content;
  document.querySelectorAll('[data-bind]').forEach((node) => {
    const value = site[node.dataset.bind];
    if (value) node.textContent = value;
  });
  document.querySelectorAll('[data-bind-href]').forEach((node) => {
    const value = site[node.dataset.bindHref];
    if (value) node.href = value;
  });
  $('#about-text').replaceChildren(...site.about.map((paragraph) => el('p', { text: paragraph })));
  if (site.aboutSource) {
    $('#about-source').replaceChildren(
      'ที่มา: ',
      el('a', { href: site.aboutSource.url, target: '_blank', rel: 'noopener', text: site.aboutSource.label }),
    );
  }
  $('#updated-at').textContent = formatThaiDate(content.updatedAt);

  const count = (type) => content.items.filter((item) => item.type === type).length;
  const stats = [
    [content.items.length, 'ผลงานทั้งหมด'],
    [count('video'), 'วิดีโอ'],
    [count('photo'), 'อัลบั้มภาพ'],
  ];
  $('#stats').replaceChildren(
    ...stats.map(([value, label]) => el('div', {}, [el('dt', { text: label }), el('dd', { text: String(value) })])),
  );
}

function renderActivities(items, categories) {
  const list = $('#activity-list');
  const more = $('#activity-more');
  const chips = $('#category-chips');
  let category = 'all';
  let shown = PAGE_SIZE;

  const draw = () => {
    const filtered = filterItems(items, { category });
    list.replaceChildren(
      ...filtered.slice(0, shown).map((item) =>
        el('li', { class: 'timeline-item' }, [
          el('button', { class: 'timeline-card', type: 'button', onclick: () => openViewer(item, categories) }, [
            el('span', { class: `badge badge-${item.type}`, text: TYPE_LABEL[item.type] }),
            el('span', { class: 'meta', text: `${formatThaiDate(item.date)} · ${categories[item.category]}` }),
            el('strong', { class: 'timeline-title', text: item.title }),
            el('span', { class: 'timeline-text', text: excerpt(item.text, 170) }),
          ]),
        ]),
      ),
    );
    more.hidden = shown >= filtered.length;
  };

  const options = [['all', 'ทั้งหมด'], ...Object.entries(categories)];
  chips.replaceChildren(
    ...options.map(([key, label]) =>
      el('button', {
        class: 'chip',
        type: 'button',
        text: label,
        'aria-pressed': String(key === category),
        onclick: (event) => {
          category = key;
          shown = PAGE_SIZE;
          chips.querySelectorAll('.chip').forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
          event.currentTarget.setAttribute('aria-pressed', 'true');
          draw();
        },
      }),
    ),
  );
  more.addEventListener('click', () => {
    shown += PAGE_SIZE;
    draw();
  });
  draw();
}

function mediaCard(item, categories) {
  const isVideo = item.type === 'video';
  const cover = isVideo ? item.poster : item.images?.[0]?.src;
  return el(
    'button',
    {
      class: `media-card media-${item.type}${isVideo ? ` is-${item.orientation}` : ''}`,
      type: 'button',
      'aria-label': `${isVideo ? 'เล่นวิดีโอ' : 'เปิดอัลบั้มภาพ'}: ${item.title}`,
      onclick: () => openViewer(item, categories),
    },
    [
      el('span', { class: 'media-cover', 'aria-hidden': 'true' }, [
        cover && el('img', { src: cover, alt: '', loading: 'lazy', decoding: 'async' }),
        (isVideo || !cover) && el('span', { class: 'media-icon', text: isVideo ? '▶' : '🖼' }),
        isVideo && el('span', { class: 'media-duration', text: formatDuration(item.durationSeconds) }),
        !isVideo && item.images?.length > 1 && el('span', { class: 'media-duration', text: `${item.images.length} ภาพ` }),
      ]),
      el('span', { class: 'media-body' }, [
        el('span', { class: 'meta', text: `${formatThaiDate(item.date)} · ${categories[item.category]}` }),
        el('strong', { text: item.title }),
        !isVideo && el('span', { class: 'media-text', text: excerpt(item.text, 90) }),
      ]),
    ],
  );
}

function renderGrid(selector, items, categories) {
  $(selector).replaceChildren(...items.map((item) => mediaCard(item, categories)));
}

/* ---------- navigation ---------- */

function setupNav() {
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
}

/* ---------- boot ---------- */

async function main() {
  setupNav();
  try {
    const response = await fetch('data/content.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const content = await response.json();
    const problems = validateContent(content);
    if (problems.length) throw new Error(`Invalid content.json:\n${problems.join('\n')}`);

    const items = sortNewestFirst(content.items);
    renderSite(content);
    renderActivities(items, content.categories);
    renderGrid('#photo-grid', filterItems(items, { type: 'photo' }), content.categories);
    renderGrid('#video-grid', filterItems(items, { type: 'video' }), content.categories);
    document.documentElement.dataset.ready = 'true';
  } catch (error) {
    console.error(error);
    $('#load-error').hidden = false;
  }
}

main();
