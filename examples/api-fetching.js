// Method A: API Fetching
// Use when a REST/GraphQL API endpoint is discovered via network monitoring.
// Typically handles ~40-50 pages per javascript_tool call.

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
