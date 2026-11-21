#!/usr/bin/env bun
import { INDEXNOW_KEY, PAGE_URLS, SITE } from "../src/seo";

const body = {
  host: new URL(SITE).host,
  key: INDEXNOW_KEY,
  keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
  urlList: PAGE_URLS,
};
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(body, null, 2));
  process.exit(0);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
console.log(
  `IndexNow: ${res.status} ${res.statusText} for ${PAGE_URLS.length} URLs`
);
if (res.status !== 200 && res.status !== 202) {
  process.exit(1);
}
