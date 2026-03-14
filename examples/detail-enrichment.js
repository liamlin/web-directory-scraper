// Step 4: Detail Page Enrichment
// Use Promise.all to fetch detail pages in parallel batches.
// Recommended: 10 parallel requests per batch, ~200 companies per javascript_tool call.

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

// Note: The regex patterns above are examples from a Taiwanese directory.
// Adapt them for the target site's locale and data format.
// Always test extraction on one detail page first before running a full batch.
