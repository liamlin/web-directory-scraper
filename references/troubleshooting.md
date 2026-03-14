# Troubleshooting Guide

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

- **Do not start with Python `requests` or `curl`** — In sandboxed environments, outbound HTTP from the VM is typically blocked. The browser's network stack is the reliable path.
- **Do not navigate page-by-page if `fetch()` + `DOMParser` works** — Page navigation takes seconds per page; in-browser fetch takes milliseconds. For 20+ pages, this difference is enormous.
- **Do not try to transfer large datasets through `javascript_tool` return values** — They truncate silently at ~5KB (even less for CJK text). For large datasets, generate Excel in-browser with SheetJS. For medium datasets (~50-200 records), use the `get_page_text` bridge: write data to `document.body`, then read with `get_page_text`.
- **Do not assume `fetch()` fails for the entire site just because one page type is JS-rendered** — Test listing pages and detail pages independently. Many CMS platforms (Cyberbiz, Shopify) render navigation/listing content client-side but serve full HTML for individual content pages.
- **Do not skip verification** — Partial data that *looks* complete is the worst outcome. A count check catches most problems.
- **Do not forget the raw JSON backup** — Regenerating a spreadsheet from JSON takes seconds; re-scraping a website takes minutes and the data might have changed.
