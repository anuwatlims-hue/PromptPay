import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  excerpt,
  filterItems,
  formatDuration,
  formatThaiDate,
  isLocalMediaPath,
  postEmbedUrl,
  sortNewestFirst,
  validateContent,
  videoEmbedUrl,
} from '../lib.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const content = JSON.parse(read('data/content.json'));

test('content.json is valid', () => {
  assert.deepEqual(validateContent(content), []);
});

test('content.json has activities, photos and videos', () => {
  for (const type of ['photo', 'video']) {
    assert.ok(filterItems(content.items, { type }).length > 0, `no ${type} items`);
  }
});

test('validateContent reports broken entries', () => {
  const broken = structuredClone(content);
  broken.items[0].url = 'https://example.com/x';
  broken.items[1].id = broken.items[0].id;
  broken.items[2].category = 'shop';
  const errors = validateContent(broken).join('\n');
  assert.match(errors, /url: must be a facebook\.com URL/);
  assert.match(errors, /id: duplicate/);
  assert.match(errors, /unknown category "shop"/);
  assert.deepEqual(validateContent({}), ['site: missing']);
});

test('local images must live in media/ and exist on disk', () => {
  assert.ok(isLocalMediaPath('media/concert/01.webp'));
  for (const bad of ['https://example.com/a.jpg', 'media/../secret.png', '/media/a.jpg', 'media/a.svg', undefined]) {
    assert.equal(isLocalMediaPath(bad), false, String(bad));
  }

  const withImages = structuredClone(content);
  withImages.items[0].images = [{ src: 'media/a.webp', alt: 'a' }];
  withImages.items[0].poster = 'media/poster.jpg';
  assert.deepEqual(validateContent(withImages), []);
  withImages.items[0].images = [{ src: 'https://example.com/a.jpg' }];
  assert.match(validateContent(withImages).join('\n'), /images\[0\]\.src/);

  for (const item of content.items) {
    for (const path of [item.poster, ...(item.images ?? []).map((image) => image.src)].filter(Boolean)) {
      assert.ok(existsSync(new URL(path, root)), `${item.id}: missing file ${path}`);
    }
  }
});

test('formatThaiDate uses Bangkok time and the Buddhist era', () => {
  assert.equal(formatThaiDate('2026-10-21T19:00:00+07:00'), '21 ต.ค. 2569');
  // 18:30 UTC is already the next day in Bangkok.
  assert.equal(formatThaiDate('2026-12-31T18:30:00Z'), '1 ม.ค. 2570');
  assert.equal(formatThaiDate('2026-11-12'), '12 พ.ย. 2569');
  assert.equal(formatThaiDate('not a date'), '');
});

test('formatDuration', () => {
  assert.equal(formatDuration(208), '3:28');
  assert.equal(formatDuration(18), '0:18');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(0), '');
  assert.equal(formatDuration(undefined), '');
});

test('embed URLs point at the Facebook plugins and encode the target', () => {
  const video = new URL(videoEmbedUrl('https://www.facebook.com/ThaiPoliceBand/videos/1/', { autoplay: true }));
  assert.equal(video.origin + video.pathname, 'https://www.facebook.com/plugins/video.php');
  assert.equal(video.searchParams.get('href'), 'https://www.facebook.com/ThaiPoliceBand/videos/1/');
  assert.equal(video.searchParams.get('autoplay'), 'true');

  const post = new URL(postEmbedUrl('https://www.facebook.com/ThaiPoliceBand/posts/pfbid0x', 343.6));
  assert.equal(post.origin + post.pathname, 'https://www.facebook.com/plugins/post.php');
  assert.equal(post.searchParams.get('width'), '344');

  assert.throws(() => videoEmbedUrl('javascript:alert(1)'));
  assert.throws(() => postEmbedUrl('https://evil.example/www.facebook.com/'));
});

test('sortNewestFirst and filterItems', () => {
  const sorted = sortNewestFirst(content.items);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.ok(Date.parse(sorted[i - 1].date) >= Date.parse(sorted[i].date));
  }
  assert.equal(sorted.length, content.items.length);
  assert.ok(filterItems(content.items, { category: 'concert' }).every((item) => item.category === 'concert'));
  assert.equal(filterItems(content.items).length, content.items.length);
});

test('excerpt flattens whitespace and truncates', () => {
  assert.equal(excerpt('a\n\n b'), 'a b');
  assert.equal(excerpt('abcdefghij', 5), 'abcde…');
  assert.equal(excerpt(undefined), '');
});

test('index.html provides every element app.js looks up, and no out-of-scope features', () => {
  const html = read('index.html');
  const app = read('app.js');
  const ids = [...app.matchAll(/\$\('#([\w-]+)'\)/g)].map((match) => match[1]);
  assert.ok(ids.length > 5);
  for (const id of new Set(ids)) assert.ok(html.includes(`id="${id}"`), `missing #${id} in index.html`);
  assert.doesNotMatch(html, /<form|<input|สั่งซื้อ|จองคิว/);
});
