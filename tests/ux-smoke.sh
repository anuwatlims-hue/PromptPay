#!/usr/bin/env bash
set -euo pipefail

# Requires agent-browser and a running static server (default: managed Preview).
export AGENT_BROWSER_SESSION="promptpay-ux-smoke"
trap 'agent-browser close >/dev/null 2>&1 || true' EXIT
agent-browser open "${1:-http://127.0.0.1:8000}"
agent-browser fill '#input-cid-raw' '1234567890123'
agent-browser set viewport 390 844
agent-browser eval '
  const entry = document.querySelector("#input-cid-raw");
  const badge = document.querySelector("#cid-count-badge");
  if (entry.scrollWidth > entry.clientWidth) throw new Error("Mobile ID clipped");
  if (badge.getBoundingClientRect().top < entry.getBoundingClientRect().bottom) throw new Error("Badge overlaps ID");
'
agent-browser set viewport 1440 1000
agent-browser fill '#mini-cid-grid input:nth-of-type(3)' ''
agent-browser eval '
  const raw = document.querySelector("#input-cid-raw");
  if (raw.value !== "๑-๒_๔๕-๖๗๘๙๐-๑๒-๓") throw new Error("ID positions shifted");
  if (document.querySelector("#doc-cid-2").textContent !== "") throw new Error("Paper gap lost");
  if (!document.querySelector("#cid-count-badge").textContent.includes("12/13")) throw new Error("Wrong ID count");
'
agent-browser click '#btn-to-arabic-num'
agent-browser eval '
  if (document.querySelector("#input-cid-raw").value !== "1-2_45-67890-12-3") throw new Error("Conversion lost gap");
'
agent-browser fill '#input-cid-raw' '1-2345-67890-12-3'
agent-browser eval '
  const digits = [...document.querySelectorAll("#mini-cid-grid input")].map(x => x.value).join("");
  const paper = [...document.querySelectorAll(".cid-box")].map(x => x.textContent).join("");
  if (digits !== "1234567890123" || paper !== digits) throw new Error("ID views differ after correction");
'
agent-browser fill '#mini-cid-grid input:nth-of-type(13)' ''
agent-browser eval '
  if (document.querySelector("#input-cid-raw").value !== "1-2345-67890-12") throw new Error("Trailing blank formatting");
'
agent-browser fill '#input-fullname' 'UX Test Person'
agent-browser click '#btn-clear-all'
agent-browser dialog dismiss
agent-browser eval '
  if (document.querySelector("#input-fullname").value !== "UX Test Person") throw new Error("Cancel cleared name");
  if (document.querySelector("#input-cid-raw").value !== "1-2345-67890-12") throw new Error("Cancel cleared ID");
'
agent-browser click '#btn-fill-sample'
agent-browser dialog dismiss
agent-browser eval '
  if (document.querySelector("#input-fullname").value !== "UX Test Person") throw new Error("Cancel replaced name");
'
agent-browser click '#btn-clear-all'
agent-browser dialog accept
agent-browser eval '
  if ([...document.querySelectorAll("#input-date,#input-fullname,#input-cid-raw,#input-position,#input-division,#input-sign-line,#input-sign-paren")].some(x => x.value)) throw new Error("Reset incomplete");
  if ([...document.querySelectorAll(".cid-box")].some(x => x.textContent)) throw new Error("Reset left ID on paper");
'
agent-browser click '#btn-fill-sample'
agent-browser eval '
  if (!document.querySelector("#input-fullname").value) throw new Error("Empty form should accept sample without confirmation");
'
agent-browser click '#btn-fill-sample'
agent-browser dialog accept
agent-browser eval '
  if (!document.querySelector("#input-fullname").value) throw new Error("Confirmed sample missing");
'
echo 'UX smoke checks passed'
