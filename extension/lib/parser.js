(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SubsParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parseCatalog(input) {
    if (typeof input !== "string" || !input.trim()) {
      throw new Error("กรุณาวางข้อความชุดคีย์ก่อนบันทึก");
    }

    const prefixMatch = input.match(/(?:\(Product Prefix\)|Product Prefix)\s*:\s*([^\s]+)/i);
    const prefix = prefixMatch ? prefixMatch[1] : "";
    const entries = [];
    const entryPattern = /([^:\n]+?):\s*(AVbCH\/[A-Za-z0-9+/=]+)/g;
    let match;

    while ((match = entryPattern.exec(input)) !== null) {
      const label = match[1]
        .replace(/.*AVbCH\/[A-Za-z0-9+/=]+\s*/g, "")
        .replace(/^\s*(?:\(Product Prefix\)|Product Prefix)\s*:\s*[^\s]+\s*/i, "")
        .trim();
      if (label) entries.push({ id: crypto.randomUUID(), label, key: match[2] });
    }

    if (!entries.length) {
      throw new Error("ไม่พบคีย์ โปรดใช้รูปแบบ ชื่อรายการ: AVbCH/...");
    }

    return { prefix, entries, importedAt: new Date().toISOString() };
  }

  return { parseCatalog };
});
