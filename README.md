# Web Directory Scraper

A [Claude Code](https://docs.claude.com/en/docs/claude-code) skill for scraping public directory listings from websites into structured spreadsheets.

## What it does

Point it at any website with a directory listing — member lists, company databases, product catalogs, association rosters, supplier directories — and it extracts all the data into a formatted Excel spreadsheet. It handles pagination automatically and verifies completeness so you don't end up with partial data.

## Key capabilities

- **Automatic API discovery** — detects REST/GraphQL endpoints for fastest extraction
- **Multiple fallback strategies** — HTML parsing via `DOMParser`, page-by-page navigation as last resort
- **Hybrid rendering detection** — handles sites that mix server-rendered and client-side content (common on Cyberbiz, Shopify, etc.)
- **Category-based navigation** — supports directories organized by tiers/categories instead of numbered pages
- **Detail page enrichment** — parallel-fetches individual pages for richer data (phone, address, email, etc.)
- **Complete data transfer** — multiple strategies for moving data from browser to spreadsheet, including the `get_page_text` bridge for medium datasets with CJK text
- **Verification built-in** — confirms expected vs actual record counts before delivering results

## Installation

### As a Claude Code skill

Copy the `SKILL.md` file into your Claude Code skills directory:

```bash
# In your project's .claude/skills/ directory
cp SKILL.md /path/to/your/project/.claude/skills/web-directory-scraper/SKILL.md
```

### As a Cowork skill

Place the `SKILL.md` file in your Cowork skills folder, or install the `.skill` package from the [Releases](../../releases) page.

## Usage

Once installed, just tell Claude what you want to scrape:

> "Get all the company info from this site into a spreadsheet: https://example.com/members"

> "把這個網站上的會員資料抓下來做成Excel"

> "Scrape the full member directory and include phone numbers and addresses"

The skill activates automatically when it detects a directory scraping task. It walks through a systematic workflow:

1. **Reconnaissance** — visits the site, understands the structure, asks about scope
2. **API Discovery** — monitors network requests to find the fastest extraction path
3. **Data Collection** — fetches all pages via API, HTML parsing, or browser navigation
4. **Detail Enrichment** — optionally scrapes individual pages for richer data
5. **Excel Generation** — builds a formatted spreadsheet with all collected data
6. **Verification** — confirms completeness before delivering

## Battle-tested on

This skill was developed and refined through real scraping sessions on:

- **TMDIA** (Taiwan Mold & Die Industry Association) — 424 companies across 43 paginated pages, server-rendered HTML
- **EZB2B** — 1,339 companies, REST API with JSON pagination
- **TSIA** (Taiwan Spring Industry Association) — 75 companies across 3 category tiers on a Cyberbiz e-commerce platform with hybrid client/server rendering

Each session uncovered new edge cases that were folded back into the skill's instructions.

## How it works

The skill is a detailed prompt (`SKILL.md`) that teaches Claude a systematic workflow for web scraping. It emphasizes:

- **Browser-first architecture** — all network requests happen in the browser (which has unrestricted access), not the VM (which is often sandboxed)
- **Progressive strategy selection** — tries the fastest method first (API), falls back to HTML parsing, then page navigation
- **Practical batch management** — handles JavaScript execution timeouts, `localStorage` persistence, and output size limits
- **Data transfer strategies** — three approaches based on dataset size (direct return for <50 records, `get_page_text` bridge for 50-200, in-browser SheetJS for 200+)

## Project structure

```
├── SKILL.md              # The skill prompt (core workflow, ~1,100 words)
├── examples/             # JavaScript code examples loaded on demand
│   ├── api-fetching.js       # Method A: JSON API pagination
│   ├── html-parsing.js       # Method B: fetch() + DOMParser
│   ├── detail-enrichment.js  # Parallel detail page scraping
│   ├── excel-generation.js   # SheetJS + data transfer strategies
│   └── verification.js       # Completeness verification
├── references/           # Detailed guides loaded on demand
│   ├── troubleshooting.md    # Common pitfalls and what to avoid
│   └── batch-sizing.md       # Timeout management and batch sizing
├── evals/
│   └── evals.json        # Test cases for benchmarking (7 scenarios)
└── README.md
```

## Contributing

Found a site that breaks the skill? Open an issue with the URL and a description of what went wrong. Pull requests that add new strategies or fix edge cases are welcome.

## License

MIT
