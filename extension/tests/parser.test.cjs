const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCatalog } = require("../lib/parser.js");

test("parses the supplied single-line catalog and all five keys", () => {
  const input = "(Product Prefix): subs:com.google.android.apps.subscriptions.red:g1.2tb.ai.subs_variant 12 เดือน: AVbCH/abc+/== 6 เดือน - SS (Samsung): AVbCH/def+/== 6 เดือน: AVbCH/ghi+/== 6 เดือน - 2: AVbCH/jkl+/== YouTube: AVbCH/mno+/==";
  const catalog = parseCatalog(input);
  assert.equal(catalog.prefix, "subs:com.google.android.apps.subscriptions.red:g1.2tb.ai.subs_variant");
  assert.deepEqual(catalog.entries.map(({ label, key }) => ({ label, key })), [
    { label: "12 เดือน", key: "AVbCH/abc+/==" },
    { label: "6 เดือน - SS (Samsung)", key: "AVbCH/def+/==" },
    { label: "6 เดือน", key: "AVbCH/ghi+/==" },
    { label: "6 เดือน - 2", key: "AVbCH/jkl+/==" },
    { label: "YouTube", key: "AVbCH/mno+/==" }
  ]);
});

test("parses multiline input and a catalog without a prefix", () => {
  const catalog = parseCatalog("YouTube: AVbCH/one==\n12 เดือน: AVbCH/two==");
  assert.equal(catalog.prefix, "");
  assert.equal(catalog.entries.length, 2);
});

test("rejects empty or malformed input", () => {
  assert.throws(() => parseCatalog(""), /กรุณาวาง/);
  assert.throws(() => parseCatalog("YouTube: not-a-key"), /ไม่พบคีย์/);
});
