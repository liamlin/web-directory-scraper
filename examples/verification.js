// Step 6: Verification
// Run in the browser where the data still lives.
// Report: "Collected X records from Y pages. Expected total: Z. All pages accounted for."

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
