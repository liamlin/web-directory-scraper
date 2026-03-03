---
name: web-directory-scraper
description: >
  Efficiently scrape public directory listings (member lists, company databases, product catalogs,
  association rosters, supplier directories) from websites into structured spreadsheets. Use this
  skill whenever a user asks to gather, scrape, extract, or download data from a website directory,
  e.g. "把網站上的資料抓下來", "get all the info from this site into a spreadsheet", "擷取名單".
  Also trigger when the user shares a URL to a paginated listing page and wants the data captured
  or exported — even without saying "scrape". If a URL contains a paginated list of entities, this
  skill applies. Key capabilities: automatic API endpoint discovery, full pagination handling,
  complete data capture with zero omissions.
---

# Web Directory Scraper

A systematic workflow for capturing complete public directory data from websites — fast, efficiently, and without missing any records.

## Core Philosophy

**Everything happens in the browser.** The browser has direct internet access, same-origin privileges, and a full DOM parser. The VM often can't reach external sites (proxy restrictions), so treat the browser as your primary data engine — for fetching, parsing, and even generating the final Excel file. The VM is for orchestration and verification only.

**Discover the API first, but have a strong Plan B.** Many modern sites fetch data from a REST API, which is the fastest path. But many directory sites (especially older or regional ones) are fully server-rendered with no API at all. For those, in-browser `fetch()` + `DOMParser` is nearly as fast and just as reliable. True page-by-page browser navigation is the last resort.

## Workflow Overview

```
1. Reconnaissance       → Visit site, understand structure, ask user about scope
2. API Discovery        → Monitor network requests; if no API, analyze URL patterns
3. Data Collection      → Fetch data via API or HTML parsing (always in-browser)
4. Detail Enrichment    → Optionally scrape individual detail pages for richer data
5. Excel Generation     → Build spreadsheet in-browser (SheetJS) or via VM (openpyxl)
6. Verification         → Confirm completeness (expected vs actual count)
```

## Step-by-Step Instructions

### Step 1: Reconnaissance

Navigate to the target URL. Take a screenshot and read the page to understand:

- What kind of data is listed (companies, people, products, etc.)
- How many total records exist (look for indicators like "Total: X", "共 X 筆", "Showing 1-10 of 424", page count, etc.)
- How pagination works (numbered pages, load-more button, infinite scroll, cursor-based) — or whether the directory uses **category-based navigation** instead (e.g., separate pages for "Class A members", "Class B members" with no pagination within each)
- What fields are visible per record on the listing page vs. on individual detail pages

Use `read_page` to get the accessibility tree — it often reveals pagination info and total counts that aren't immediately visible in screenshots.

**Before diving in, clarify scope with the user:**
- Which fields do they care about? ("all available" is a valid answer)
- How many pages / records? (sometimes only a subset is needed)
- Output format preference? (Excel is the default, but they might want CSV or JSON)

### Step 2: API Discovery

This is where you decide the collection strategy. Start `read_network_requests` monitoring, then click "next page" in the browser to trigger data-fetching calls.

**Path A — REST/GraphQL API found:**
If you see XHR calls like `/api/members?page=2` returning JSON, you've hit the jackpot. Note the endpoint, pagination parameter, and response structure. Proceed to Step 3, Method A.

**Path B — No API, server-rendered HTML:**
If the only request is a full-page HTML load (e.g., `/tch/m1.2-category-name`), the site is server-rendered. Note the URL pagination pattern from the page-2 URL. Proceed to Step 3, Method B.

**Path C — Data embedded in JS:**
If no XHR calls appear but the page has data, check `<script>` tags for `__NEXT_DATA__`, `__NUXT__`, or inline JSON. Extract from there.

**Path D — Client-side rendered (hybrid):**
Some sites (especially e-commerce platforms like Cyberbiz, Shopify) render content via JavaScript after the page loads. When `fetch()` returns HTML but the data you see on screen is missing from it, the content is JS-rendered. However, **test each page type separately** — the same site can mix approaches. For example, listing pages might be JS-rendered (requiring Method C navigation) while detail pages return full data in the raw HTML (enabling Method B for enrichment). Always verify by checking whether key data (like a phone number visible on screen) appears in the `fetch()` response.

### Step 3: Data Collection

All methods below use in-browser `fetch()` — this is intentional. Direct HTTP from the VM (Python `requests`, `curl`, etc.) is typically blocked by proxy restrictions in sandboxed environments, while the browser has unrestricted network access.

#### Method A: API Fetching (when API exists)

Fetch the JSON API for every page in a single `javascript_tool` call:

```javascript
(async () => {
  const allRecords = [];
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const resp = await fetch(`/api/endpoint?page=${page}`);
    const data = await resp.json();
    allRecords.push(...data.items);
  }
  localStorage.setItem('scraped_data', JSON.stringify(allRecords));
  return { collected: allRecords.length };
})();
```

#### Method B: In-Browser HTML Fetch + DOMParser (when no API exists)

This is the key technique for server-rendered sites. Instead of navigating the browser page by page (slow), fetch each page's HTML using `fetch()` and parse it with `DOMParser` — all within a single `javascript_tool` call. This runs at roughly the same speed as API fetching.

```javascript
(async () => {
  const allCompanies = [];
  const pageUrls = ['/directory/page1'];
  for (let i = 2; i <= TOTAL_PAGES; i++) {
    pageUrls.push(`/directory/page${i}-category`);
  }
  for (const url of pageUrls) {
    const resp = await fetch(url);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Extract structured data from the parsed DOM
    doc.querySelectorAll('.company-card').forEach(card => {
      allCompanies.push({
        name: card.querySelector('.name')?.textContent.trim() || '',
        desc: card.querySelector('.description')?.textContent.trim() || ''
      });
    });
  }
  localStorage.setItem('scraped_data', JSON.stringify(allCompanies));
  return { collected: allCompanies.length };
})();
```

To discover the right CSS selectors, first examine a few cards on the live page using `javascript_tool`:
```javascript
// Inspect the DOM structure of company entries
const card = document.querySelector('.container .item'); // adjust selector
[...card.children].map(el => ({ tag: el.tagName, cls: el.className, text: el.textContent.trim().substring(0, 60) }));
```

#### Method C: Page-by-Page Browser Navigation (last resort)

Only if `fetch()` doesn't work (e.g., the site requires cookies set by client-side JS, or uses anti-bot measures):
1. Navigate to each page URL
2. Use `javascript_tool` to extract data from the live DOM
3. Store in `localStorage` incrementally
4. Retrieve after all pages are done

This is 10-50x slower than Methods A/B because each navigation takes several seconds.

### Important: Timeout and Batch Management

`javascript_tool` calls have an execution time limit. A script that fetches 40+ pages sequentially may trigger a "Detached while handling command" error — but the script may still complete in the background if it saves to `localStorage` before timing out.

**Practical batch sizing:**
- **API fetching (JSON):** ~40-50 pages per call is usually safe
- **HTML fetching + DOMParser:** ~20-30 pages per call (HTML parsing is heavier)
- **Detail page fetching with `Promise.all`:** 10 parallel requests per batch

If a call times out, wait 15-20 seconds and check `localStorage` — the data may have been saved. Then continue from where it left off.

### Step 4: Detail Enrichment (Optional but Often Valuable)

Many directories show minimal info on listing pages (just name + brief description) but have much richer data on individual company/member detail pages (phone, fax, address, website, certifications, English name, etc.).

**When to do it:** When the user wants "all available info" and the listing page only shows a subset. Check one detail page first to see what extra fields exist.

**How to do it efficiently:** Use `Promise.all` to fetch detail pages in parallel batches. This is dramatically faster than sequential fetching:

```javascript
(async () => {
  const companies = JSON.parse(localStorage.getItem('scraped_data'));
  const batchSize = 10; // parallel requests per batch
  const details = [];

  function extractDetail(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.textContent || '';
    return {
      phone: (text.match(/886-\d+-\d+/g) || [])[0] || '',
      address: (text.match(/[\u53F0\u9AD8\u65B0][\u5317\u4E2D\u5357][^\s]{5,50}[\u865F\u6A13]/)?.[0]) || '',
      website: (text.match(/www\.[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}/)?.[0]) || ''
    };
  }

  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (c) => {
      const resp = await fetch(c.detailPath);
      const html = await resp.text();
      return { ...c, ...extractDetail(html) };
    }));
    details.push(...results);
  }

  localStorage.setItem('scraped_enriched', JSON.stringify(details));
  return { enriched: details.length };
})();
```

The regex patterns above are examples from a Taiwanese directory — adapt them for the target site's locale and data format. Always test your extraction on one detail page first before running a full batch.

**Batch sizing for detail pages:** 200 companies per `javascript_tool` call (at 10 parallel) is a reliable batch size. For 1000+ companies, split across multiple calls, checking `localStorage` between each.

### Step 5: Excel Generation

**Preferred approach for large datasets: build the Excel directly in the browser with SheetJS.** This completely bypasses the browser→VM data transfer bottleneck (the `javascript_tool` output is limited to ~5KB, which makes transferring hundreds of records impractical).

```javascript
// Load SheetJS
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
document.head.appendChild(script);
// Wait for it to load, then:

const data = JSON.parse(localStorage.getItem('scraped_enriched'));
const headers = ['No.', 'Company', 'Phone', 'Fax', 'Address', 'Website', 'Products'];
const rows = data.map((c, i) => [i+1, c.name, c.phone, c.fax, c.address, c.website, c.products]);
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
ws['!cols'] = headers.map((_, i) => ({ wch: [6,30,18,18,40,30,50][i] }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Companies');
XLSX.writeFile(wb, 'Directory_Data.xlsx');
```

Also trigger a raw JSON backup download — it's the safety net for regenerating the spreadsheet later:
```javascript
const blob = new Blob([localStorage.getItem('scraped_enriched')], {type: 'application/json'});
const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
a.download = 'Directory_Data_Backup.json'; a.click();
```

**Alternative for medium datasets (50-200 records) — use `get_page_text` to transfer data to the VM:**
The `javascript_tool` output truncates at ~5KB (even fewer characters for Chinese/CJK text), but `get_page_text` has a much higher limit. Write all data to the page body as a pipe-delimited text block, then read it with `get_page_text`:

```javascript
// In javascript_tool: write data to page body
const data = JSON.parse(localStorage.getItem('scraped_enriched'));
const lines = data.map(c => [c.category, c.name, c.phone, c.address, c.website, c.email, c.products].join('|'));
document.body.innerHTML = '<pre>===DATA_START===\n' + lines.join('\n') + '\n===DATA_END===</pre>';
```
Then call `get_page_text` to read the full text (typically handles 30-50KB+), save to a file on the VM with `Write`, and use the **xlsx skill** or `openpyxl` to build a formatted spreadsheet. This gives more control over formatting (colors, borders, freeze panes) than SheetJS.

**Alternative for very small datasets (<50 records):** Transfer data directly via `javascript_tool` return value if it fits within ~5KB.

### Step 6: Verification

Verification matters because partial data is worse than no data — the user might make business decisions based on a list they believe is complete. A silent gap (e.g., missing pages 4-41 out of 43) can go unnoticed if the file *looks* full.

Run verification in the browser where the data still lives:

```javascript
const data = JSON.parse(localStorage.getItem('scraped_enriched'));
const byPage = {};
data.forEach(c => { byPage[c.page] = (byPage[c.page] || 0) + 1; });
JSON.stringify({
  total: data.length,
  pages: Object.keys(byPage).length,
  perPage: Object.entries(byPage).map(([p,c]) => p+':'+c).join(', '),
  withPhone: data.filter(c => c.phone).length,
  withAddress: data.filter(c => c.address).length,
  emptyRecords: data.filter(c => !c.name).length
});
```

Report clearly: "Collected X records from Y pages. Expected total: Z. All pages accounted for."

## Common Pitfalls and Solutions

| Problem | Why it happens | Solution |
|---------|---------------|----------|
| `fetch()` returns empty HTML | Site uses client-side rendering (JS-built DOM) | Find the API via `read_network_requests`; or use Method C (navigate + live DOM). But test detail pages separately — they may still work with `fetch()` |
| Python `requests` blocked | VM proxy restrictions | Use in-browser `fetch()` instead |
| JS output truncated at ~5KB | `javascript_tool` has a response size limit | For large datasets: build Excel in-browser with SheetJS. For medium datasets: write to `document.body` and read with `get_page_text`. Always use `localStorage` as intermediary |
| "Detached while handling command" | JS execution exceeded timeout | Use smaller batches; check `localStorage` after timeout — data may have saved |
| JS variables lost between calls | Each `javascript_tool` runs in fresh context | Use `localStorage` (persists on same domain) |
| Listing page has minimal data | Detail pages hold richer info (phone, address, etc.) | Do two-level scraping: listing index first, then parallel detail-page enrichment |
| Rate limiting / 429 errors | Too many requests too fast | Add delays; reduce `Promise.all` batch size |
| Detail page regex misses data | Address/phone patterns vary by region | Test regex on a few pages first; adjust patterns for the site's locale |

## What to Avoid (and Why)

- **Don't start with Python `requests` or `curl`** — In sandboxed environments, outbound HTTP from the VM is typically blocked. The browser's network stack is the reliable path.
- **Don't navigate page-by-page if `fetch()` + `DOMParser` works** — Page navigation takes seconds per page; in-browser fetch takes milliseconds. For 20+ pages, this difference is enormous.
- **Don't try to transfer large datasets through `javascript_tool` return values** — They truncate silently at ~5KB (even less for CJK text). For large datasets, generate Excel in-browser with SheetJS. For medium datasets (~50-200 records), use the `get_page_text` bridge: write data to `document.body`, then read with `get_page_text`.
- **Don't assume `fetch()` fails for the entire site just because one page type is JS-rendered** — Test listing pages and detail pages independently. Many CMS platforms (Cyberbiz, Shopify) render navigation/listing content client-side but serve full HTML for individual content pages.
- **Don't skip verification** — Partial data that *looks* complete is the worst outcome. A count check catches most problems.
- **Don't forget the raw JSON backup** — Regenerating a spreadsheet from JSON takes seconds; re-scraping a website takes minutes and the data might have changed.
