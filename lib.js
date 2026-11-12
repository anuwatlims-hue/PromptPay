// Pure helpers shared by the page (app.js) and the Node tests.

export const ITEM_TYPES = ['video', 'photo', 'post'];

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const FACEBOOK_URL = /^https:\/\/www\.facebook\.com\/[^\s]+$/;
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** "2026-10-21T19:00:00+07:00" -> "21 ต.ค. 2569" (Bangkok time, Buddhist era). */
export function formatThaiDate(iso) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  // Shift to Bangkok wall-clock time so the result does not depend on the viewer's time zone.
  const d = new Date(time + BANGKOK_OFFSET_MS);
  return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

/** 208 -> "3:28" */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function isFacebookUrl(url) {
  return typeof url === 'string' && FACEBOOK_URL.test(url);
}

/** Images are served from this site only: a relative path inside media/. */
export function isLocalMediaPath(path) {
  return typeof path === 'string' && /^media\/[\w\-./]+\.(webp|avif|jpe?g|png)$/i.test(path) && !path.includes('..');
}

export function videoEmbedUrl(videoUrl, { autoplay = false } = {}) {
  if (!isFacebookUrl(videoUrl)) throw new Error(`Not a Facebook URL: ${videoUrl}`);
  const params = new URLSearchParams({ href: videoUrl, show_text: 'false', autoplay: String(autoplay) });
  return `https://www.facebook.com/plugins/video.php?${params}`;
}

export function postEmbedUrl(postUrl, width = 500) {
  if (!isFacebookUrl(postUrl)) throw new Error(`Not a Facebook URL: ${postUrl}`);
  const params = new URLSearchParams({ href: postUrl, show_text: 'true', width: String(Math.round(width)) });
  return `https://www.facebook.com/plugins/post.php?${params}`;
}

export function sortNewestFirst(items) {
  return [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function filterItems(items, { type = 'all', category = 'all' } = {}) {
  return items.filter(
    (item) => (type === 'all' || item.type === type) && (category === 'all' || item.category === category),
  );
}

/** First paragraph of a post, trimmed to `max` characters. */
export function excerpt(text, max = 140) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).trimEnd()}…`;
}

/** Returns a list of human-readable problems; an empty list means the content is valid. */
export function validateContent(content) {
  const errors = [];
  const site = content?.site;
  if (!site || typeof site !== 'object') return ['site: missing'];
  for (const key of ['name', 'nameEn', 'tagline', 'organization']) {
    if (typeof site[key] !== 'string' || !site[key].trim()) errors.push(`site.${key}: required`);
  }
  if (!isFacebookUrl(site.facebookUrl)) errors.push('site.facebookUrl: must be a facebook.com URL');
  if (!Array.isArray(site.about) || site.about.length === 0) errors.push('site.about: required');

  const categories = content.categories ?? {};
  if (!Array.isArray(content.items) || content.items.length === 0) return [...errors, 'items: required'];

  const ids = new Set();
  content.items.forEach((item, index) => {
    const where = `items[${index}]${item?.id ? ` (${item.id})` : ''}`;
    if (!item || typeof item !== 'object') return errors.push(`${where}: must be an object`);
    if (typeof item.id !== 'string' || !item.id) errors.push(`${where}.id: required`);
    else if (ids.has(item.id)) errors.push(`${where}.id: duplicate`);
    else ids.add(item.id);
    if (!ITEM_TYPES.includes(item.type)) errors.push(`${where}.type: must be one of ${ITEM_TYPES.join(', ')}`);
    if (typeof item.title !== 'string' || !item.title.trim()) errors.push(`${where}.title: required`);
    if (Number.isNaN(Date.parse(item.date))) errors.push(`${where}.date: must be an ISO date`);
    if (!isFacebookUrl(item.url)) errors.push(`${where}.url: must be a facebook.com URL`);
    if (!(item.category in categories)) errors.push(`${where}.category: unknown category "${item.category}"`);
    if (item.type === 'video') {
      if (!isFacebookUrl(item.videoUrl)) errors.push(`${where}.videoUrl: must be a facebook.com URL`);
      if (!['landscape', 'portrait'].includes(item.orientation)) errors.push(`${where}.orientation: landscape or portrait`);
    }
    if (item.poster !== undefined && !isLocalMediaPath(item.poster)) errors.push(`${where}.poster: must be an image path inside media/`);
    if (item.images !== undefined) {
      if (!Array.isArray(item.images) || item.images.length === 0) errors.push(`${where}.images: must be a non-empty list`);
      else {
        item.images.forEach((image, i) => {
          if (!isLocalMediaPath(image?.src)) errors.push(`${where}.images[${i}].src: must be an image path inside media/`);
        });
      }
    }
    return undefined;
  });
  return errors;
}
