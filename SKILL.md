---
name: web-directory-scraper
description: >
  This skill should be used when the user asks to "scrape a directory", "gather company data",
  "get all the info from this site into a spreadsheet", "download member list", "extract data
  from this website", "把網站上的資料抓下來", "擷取名單", or "幫我抓這個網站的資料".
  Also applies when the user shares a URL to a paginated listing page and wants the data
  captured or exported — even without explicitly saying "scrape". If a URL contains a paginated
  list of entities (member lists, company databases, product catalogs, association rosters,
  supplier directories), this skill applies.
---

# Web Directory Scraper

A systematic workflow for capturing complete public directory data from websites into structured spreadsheets.

## Core Principles

Perform all network requests in the browser. The browser has direct internet access and same-origin privileges; the VM often cannot reach external sites due to proxy restrictions. Treat the browser as the primary data engine — for fetching, parsing, and even generating the final Excel file. Reserve the VM for orchestration and verification only.

Discover the API first, but maintain a strong fallback plan. Many modern sites fetch data from a REST API (fastest path). Many directory sites, especially older or regional ones, are fully server-rendered with no API. For those, in-browser `fetch()` + `DOMParser` is nearly as fast. True page-by-page browser navigation is the last resort.

## Workflow Overview

```
1. Reconnaissance       → Visit site, understand structure, clarify scope with user
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

Use `read_page` to get the accessibility tree — it often reveals pagination info and total counts not immediately visible in screenshots.

**Clarify scope with the user before proceeding:**
- Which fields do they care about? ("all available" is a valid answer)
- How many pages / records? (sometimes only a subset is needed)
- Output format preference? (Excel is the default, but they might want CSV or JSON)

### Step 2: API Discovery

This step determines the collection strategy. Start `read_network_requests` monitoring, then click "next page" in the browser to trigger data-fetching calls.

**Path A — REST/GraphQL API found:**
XHR calls like `/api/members?page=2` returning JSON indicate the ideal case. Note the endpoint, pagination parameter, and response structure. Proceed to Step 3, Method A.

**Path B — No API, server-rendered HTML:**
If the only request is a full-page HTML load (e.g., `/tch/m1.2-category-name`), the site is server-rendered. Note the URL pagination pattern. Proceed to Step 3, Method B.

**Path C — Data embedded in JS:**
If no XHR calls appear but the page has data, check `<script>` tags for `__NEXT_DATA__`, `__NUXT__`, or inline JSON. Extract from there.

**Path D — Client-side rendered (hybrid):**
Some sites (especially Cyberbiz, Shopify) render content via JavaScript after page load. When `fetch()` returns HTML but visible data is missing from it, the content is JS-rendered. However, **test each page type separately** — the same site can mix approaches. Listing pages might be JS-rendered while detail pages return full data in raw HTML.

### Step 3: Data Collection

All methods use in-browser `fetch()`. Direct HTTP from the VM is typically blocked by proxy restrictions.

**Method A: API Fetching** — Fetch the JSON API for every page in a single `javascript_tool` call. See `examples/api-fetching.js` for the complete implementation.

**Method B: HTML Fetch + DOMParser** — Fetch each page's HTML and parse with `DOMParser` in a single `javascript_tool` call. This runs at roughly the same speed as API fetching and is the key technique for server-rendered sites. See `examples/html-parsing.js` for the complete implementation, including CSS selector discovery.

**Method C: Page-by-Page Navigation (last resort)** — Only if `fetch()` doesn't work (e.g., the site requires cookies set by client-side JS, or uses anti-bot measures). Navigate to each page URL, extract data with `javascript_tool`, and store in `localStorage` incrementally. This is 10-50x slower than Methods A/B.

For batch sizing and timeout management details, consult `references/batch-sizing.md`.

### Step 4: Detail Enrichment (Optional)

Many directories show minimal info on listing pages but have much richer data on detail pages (phone, fax, address, website, certifications, etc.).

**When to enrich:** When the user wants "all available info" and the listing page only shows a subset. Check one detail page first to see what extra fields exist.

**How to enrich:** Use `Promise.all` to fetch detail pages in parallel batches (10 concurrent, ~200 companies per `javascript_tool` call). See `examples/detail-enrichment.js` for the complete implementation with locale-adaptable regex extraction.

### Step 5: Excel Generation

**Large datasets (200+ records):** Build the Excel directly in the browser with SheetJS. This bypasses the browser-to-VM data transfer bottleneck. Also generate a raw JSON backup download as a safety net. See `examples/excel-generation.js` for all approaches.

**Medium datasets (50-200 records):** Use the `get_page_text` bridge — write data to `document.body` as plain text, read with `get_page_text`, then build a formatted spreadsheet on the VM with `openpyxl`.

**Small datasets (<50 records):** Transfer data directly via `javascript_tool` return value.

### Step 6: Verification

Verification matters because partial data is worse than no data — silent gaps (e.g., missing pages 4-41 out of 43) can go unnoticed if the file *looks* full. Run verification in the browser where the data still lives. See `examples/verification.js` for the verification script.

Report clearly: "Collected X records from Y pages. Expected total: Z. All pages accounted for."

## Additional Resources

### Reference Files

- **`references/troubleshooting.md`** — Common pitfalls (empty HTML from `fetch()`, JS timeout, truncated output, rate limiting) with causes and solutions, plus a "What to Avoid" checklist
- **`references/batch-sizing.md`** — Practical batch sizes for API fetching, HTML parsing, and detail enrichment; timeout recovery; data transfer strategy by dataset size; CJK text considerations

### Example Files

Working JavaScript examples for each workflow step:
- **`examples/api-fetching.js`** — Method A: JSON API pagination loop
- **`examples/html-parsing.js`** — Method B: `fetch()` + `DOMParser` with CSS selector discovery
- **`examples/detail-enrichment.js`** — Step 4: Parallel detail page fetching with regex extraction
- **`examples/excel-generation.js`** — Step 5: SheetJS, `get_page_text` bridge, and JSON backup approaches
- **`examples/verification.js`** — Step 6: Completeness check with per-page breakdown
