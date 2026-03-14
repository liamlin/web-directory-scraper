// Method B: In-Browser HTML Fetch + DOMParser
// Use when no API exists and the site is server-rendered.
// Runs at roughly the same speed as API fetching.
// Typically handles ~20-30 pages per javascript_tool call.

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

// --- Discovering CSS selectors ---
// Run this first to inspect the DOM structure of entries on the live page:

// const card = document.querySelector('.container .item'); // adjust selector
// [...card.children].map(el => ({
//   tag: el.tagName, cls: el.className,
//   text: el.textContent.trim().substring(0, 60)
// }));
