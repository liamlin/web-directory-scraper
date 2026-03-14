# Timeout and Batch Management

`javascript_tool` calls have an execution time limit. A script that fetches 40+ pages sequentially may trigger a "Detached while handling command" error — but the script may still complete in the background if it saves to `localStorage` before timing out.

## Practical Batch Sizing

| Method | Pages per call | Notes |
|--------|---------------|-------|
| API fetching (JSON) | ~40-50 | Lightweight responses, fast parsing |
| HTML fetching + DOMParser | ~20-30 | HTML parsing is heavier than JSON |
| Detail page fetching (`Promise.all`) | 10 parallel per batch | ~200 companies per `javascript_tool` call |

## Timeout Recovery

If a call times out, wait 15-20 seconds and check `localStorage` — the data may have been saved. Then continue from where it left off.

## Data Transfer Strategy by Dataset Size

| Dataset size | Strategy | Details |
|-------------|----------|---------|
| Small (<50 records) | Direct return | Transfer via `javascript_tool` return value if it fits within ~5KB |
| Medium (50-200 records) | `get_page_text` bridge | Write to `document.body`, read with `get_page_text` (handles 30-50KB+), then build Excel on VM with `openpyxl` |
| Large (200+ records) | In-browser SheetJS | Build Excel directly in the browser, bypassing data transfer entirely |

## CJK Text Considerations

The ~5KB `javascript_tool` output limit is measured in bytes, not characters. CJK (Chinese/Japanese/Korean) text uses 3 bytes per character in UTF-8, so the effective character limit is roughly one-third of what it would be for ASCII text. Always use `localStorage` as an intermediary for CJK-heavy datasets and prefer the SheetJS or `get_page_text` approaches.
